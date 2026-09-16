-- Create enums for listing types, status, and roles
CREATE TYPE public.listing_type AS ENUM ('residential', 'agricultural', 'commercial');
CREATE TYPE public.listing_status AS ENUM ('verified', 'unverified');
CREATE TYPE public.app_role AS ENUM ('buyer', 'seller', 'admin');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'buyer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create listings table
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type public.listing_type NOT NULL DEFAULT 'residential',
  area NUMERIC NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  status public.listing_status NOT NULL DEFAULT 'unverified',
  boundary JSONB DEFAULT '[]'::jsonb,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create listing_documents table
CREATE TABLE public.listing_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  url TEXT,
  is_mock BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inquiries table
CREATE TABLE public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  listing_title TEXT NOT NULL,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_contact TEXT NOT NULL,
  message TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', ''));
  
  -- Assign default buyer role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'buyer');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for listings
CREATE POLICY "Anyone can view verified listings"
  ON public.listings FOR SELECT
  USING (status = 'verified');

CREATE POLICY "Sellers can view their own listings"
  ON public.listings FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create listings"
  ON public.listings FOR INSERT
  WITH CHECK (auth.uid() = seller_id AND public.has_role(auth.uid(), 'seller'));

CREATE POLICY "Sellers can update their own listings"
  ON public.listings FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own listings"
  ON public.listings FOR DELETE
  USING (auth.uid() = seller_id);

CREATE POLICY "Admins can manage all listings"
  ON public.listings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for listing_documents
CREATE POLICY "Anyone can view documents of verified listings"
  ON public.listing_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE id = listing_id AND status = 'verified'
    )
  );

CREATE POLICY "Sellers can view documents of their own listings"
  ON public.listing_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE id = listing_id AND seller_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can manage documents of their own listings"
  ON public.listing_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE id = listing_id AND seller_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all documents"
  ON public.listing_documents FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for inquiries
CREATE POLICY "Buyers can create inquiries"
  ON public.inquiries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Sellers can view inquiries for their listings"
  ON public.inquiries FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Admins can view all inquiries"
  ON public.inquiries FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-documents', 'listing-documents', false);

-- Storage policies for listing-images (public bucket)
CREATE POLICY "Anyone can view listing images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

CREATE POLICY "Authenticated users can upload listing images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'listing-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own listing images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own listing images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for listing-documents (private bucket)
CREATE POLICY "Users can view their own listing documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all listing documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can upload listing documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'listing-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own listing documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'listing-documents' AND auth.uid()::text = (storage.foldername(name))[1]);