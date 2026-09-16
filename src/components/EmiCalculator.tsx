/**
 * EmiCalculator — interactive loan/EMI calculator for listing detail pages.
 *
 * Features:
 * - Auto-fills price from the listing
 * - Sliders for down payment %, interest rate, tenure
 * - Live EMI, total interest, total payment output
 * - Indian number formatting (lakhs / crores)
 * - Breakdown bar showing principal vs interest split
 * - Collapsible so it doesn't clutter the sidebar on mobile
 */
import * as React from "react";
import { useState } from "react";
import { Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { formatIndianPrice } from "@/types";

interface EmiCalculatorProps {
  propertyPrice: number;
}

function calcEmi(principal: number, annualRate: number, tenureYears: number): number {
  if (principal <= 0 || annualRate <= 0 || tenureYears <= 0) return 0;
  const r = annualRate / 12 / 100;
  const n = tenureYears * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function EmiCalculator({ propertyPrice }: EmiCalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [downPct, setDownPct] = useState(20);       // % of property price
  const [rate, setRate] = useState(8.5);             // % per annum
  const [tenure, setTenure] = useState(15);          // years

  const downAmount = Math.round((downPct / 100) * propertyPrice);
  const loanAmount = propertyPrice - downAmount;
  const emi = calcEmi(loanAmount, rate, tenure);
  const totalPayment = emi * tenure * 12;
  const totalInterest = totalPayment - loanAmount;
  const interestPct = totalPayment > 0 ? Math.round((totalInterest / totalPayment) * 100) : 0;
  const principalPct = 100 - interestPct;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between p-5 hover:bg-muted/50 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calculator size={18} className="text-primary" />
          </div>
          <div className="text-left">
            <p className="font-bold text-card-foreground text-sm">EMI Calculator</p>
            {!isOpen && emi > 0 && (
              <p className="text-xs text-primary font-medium mt-0.5">
                ≈ {formatIndianPrice(Math.round(emi))} / month
              </p>
            )}
          </div>
        </div>
        {isOpen ? (
          <ChevronUp size={18} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={18} className="text-muted-foreground" />
        )}
      </button>

      {/* Expanded body */}
      {isOpen && (
        <div className="px-5 pb-5 space-y-5 border-t border-border pt-4">

          {/* Property price (read-only display) */}
          <div className="bg-muted rounded-xl px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Property price</span>
            <span className="font-bold text-card-foreground">
              {formatIndianPrice(propertyPrice)}
            </span>
          </div>

          {/* Down payment slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-card-foreground">
                Down payment
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-primary">{downPct}%</span>
                <span className="text-xs text-muted-foreground">
                  ({formatIndianPrice(downAmount)})
                </span>
              </div>
            </div>
            <input
              type="range"
              min={5}
              max={90}
              step={5}
              value={downPct}
              onChange={(e) => setDownPct(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>5%</span>
              <span>90%</span>
            </div>
          </div>

          {/* Interest rate slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-card-foreground">
                Interest rate
              </label>
              <span className="text-sm font-bold text-primary">{rate.toFixed(1)}% p.a.</span>
            </div>
            <input
              type="range"
              min={6}
              max={16}
              step={0.5}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>6%</span>
              <span>16%</span>
            </div>
          </div>

          {/* Tenure slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-card-foreground">
                Loan tenure
              </label>
              <span className="text-sm font-bold text-primary">{tenure} yrs</span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={tenure}
              onChange={(e) => setTenure(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1 yr</span>
              <span>30 yrs</span>
            </div>
          </div>

          {/* Results */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
            {/* Monthly EMI — hero number */}
            <div className="text-center pb-3 border-b border-primary/10">
              <p className="text-xs text-muted-foreground mb-1">Monthly EMI</p>
              <p className="text-3xl font-bold text-primary">
                {formatIndianPrice(Math.round(emi))}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Loan amount</p>
                <p className="font-bold text-card-foreground text-sm">
                  {formatIndianPrice(loanAmount)}
                </p>
              </div>
              <div className="bg-card rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Total interest</p>
                <p className="font-bold text-orange-600 text-sm">
                  {formatIndianPrice(Math.round(totalInterest))}
                </p>
              </div>
              <div className="bg-card rounded-lg p-3 text-center col-span-2">
                <p className="text-xs text-muted-foreground mb-0.5">Total payment</p>
                <p className="font-bold text-card-foreground text-sm">
                  {formatIndianPrice(Math.round(totalPayment))}
                </p>
              </div>
            </div>

            {/* Principal vs interest bar */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Principal {principalPct}%</span>
                <span>Interest {interestPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${principalPct}%` }}
                />
                <div
                  className="h-full bg-orange-400 flex-1 transition-all duration-300"
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Indicative only. Actual EMI depends on lender terms and credit profile.
          </p>
        </div>
      )}
    </div>
  );
}
