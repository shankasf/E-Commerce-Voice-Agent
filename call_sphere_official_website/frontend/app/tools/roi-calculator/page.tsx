"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  DollarSign,
  TrendingUp,
  Clock,
  Phone,
} from "lucide-react";

import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export default function ROICalculatorPage() {
  const [monthlyCallVolume, setMonthlyCallVolume] = useState(1000);
  const [avgCostPerCall, setAvgCostPerCall] = useState(8);
  const [currentAgentCount, setCurrentAgentCount] = useState(3);
  const [avgAgentSalary, setAvgAgentSalary] = useState(42000);
  const [afterHoursMissedCalls, setAfterHoursMissedCalls] = useState(200);
  const [avgRevenuePerMissedCall, setAvgRevenuePerMissedCall] = useState(150);

  const results = useMemo(() => {
    const aiResolutionRate = 0.85;
    const aiCostPerCall = 0.3;

    // Current costs
    const currentMonthlyCost = monthlyCallVolume * avgCostPerCall;
    const currentAnnualLaborCost = currentAgentCount * avgAgentSalary;
    const currentMonthlyLaborCost = currentAnnualLaborCost / 12;
    const missedCallRevenueLoss =
      afterHoursMissedCalls * avgRevenuePerMissedCall;

    // AI costs
    const aiHandledCalls = Math.floor(monthlyCallVolume * aiResolutionRate);
    const humanHandledCalls = monthlyCallVolume - aiHandledCalls;
    const aiCallCost = aiHandledCalls * aiCostPerCall;
    const humanCallCost = humanHandledCalls * avgCostPerCall;

    // Reduced agents needed (keep at least 1)
    const reducedAgentCount = Math.max(
      1,
      Math.ceil(currentAgentCount * (1 - aiResolutionRate))
    );
    const reducedMonthlyLaborCost = (reducedAgentCount * avgAgentSalary) / 12;

    // CallSphere plan cost (auto-select based on volume)
    let planCost = 149;
    let planName = "Starter";
    if (monthlyCallVolume > 5000) {
      planCost = 1499;
      planName = "Scale";
    } else if (monthlyCallVolume > 1000) {
      planCost = 499;
      planName = "Growth";
    }

    const newMonthlyCost =
      aiCallCost + humanCallCost + reducedMonthlyLaborCost + planCost;
    const currentTotalMonthlyCost =
      currentMonthlyCost + currentMonthlyLaborCost;
    const monthlySavings = currentTotalMonthlyCost - newMonthlyCost;
    const annualSavings = monthlySavings * 12;
    const recoveredRevenue = missedCallRevenueLoss * 0.8; // AI captures 80% of missed calls
    const totalAnnualBenefit = annualSavings + recoveredRevenue * 12;
    const savingsPercentage = Math.round(
      (monthlySavings / currentTotalMonthlyCost) * 100
    );

    return {
      currentMonthlyCost: currentTotalMonthlyCost,
      newMonthlyCost,
      monthlySavings,
      annualSavings,
      recoveredRevenue,
      totalAnnualBenefit,
      savingsPercentage,
      aiHandledCalls,
      reducedAgentCount,
      planName,
      planCost,
    };
  }, [
    monthlyCallVolume,
    avgCostPerCall,
    currentAgentCount,
    avgAgentSalary,
    afterHoursMissedCalls,
    avgRevenuePerMissedCall,
  ]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <>
      <Nav />
      <main id="main" className="relative">
        {/* Hero */}
        <section className="section-shell pt-16 pb-12">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
              <Calculator className="h-4 w-4" />
              ROI Calculator
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Calculate Your AI Voice Agent ROI
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              See how much you can save by automating customer calls with
              CallSphere AI voice agents. Adjust the inputs to match your
              business.
            </p>
          </div>
        </section>

        {/* Calculator */}
        <section className="section-stack pb-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Inputs */}
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">
                  Your Current Numbers
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Adjust the sliders to match your business.
                </p>

                <div className="mt-8 space-y-8">
                  {/* Monthly Call Volume */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">
                        Monthly call volume
                      </label>
                      <span className="text-sm font-bold text-slate-900">
                        {monthlyCallVolume.toLocaleString()}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={20000}
                      step={100}
                      value={monthlyCallVolume}
                      onChange={(e) =>
                        setMonthlyCallVolume(Number(e.target.value))
                      }
                      className="mt-2 w-full accent-indigo-600"
                    />
                    <div className="mt-1 flex justify-between text-xs text-slate-400">
                      <span>100</span>
                      <span>20,000</span>
                    </div>
                  </div>

                  {/* Cost Per Call */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">
                        Average cost per call (human)
                      </label>
                      <span className="text-sm font-bold text-slate-900">
                        ${avgCostPerCall}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={3}
                      max={20}
                      step={1}
                      value={avgCostPerCall}
                      onChange={(e) =>
                        setAvgCostPerCall(Number(e.target.value))
                      }
                      className="mt-2 w-full accent-indigo-600"
                    />
                    <div className="mt-1 flex justify-between text-xs text-slate-400">
                      <span>$3</span>
                      <span>$20</span>
                    </div>
                  </div>

                  {/* Agent Count */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">
                        Current phone agents
                      </label>
                      <span className="text-sm font-bold text-slate-900">
                        {currentAgentCount}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={50}
                      step={1}
                      value={currentAgentCount}
                      onChange={(e) =>
                        setCurrentAgentCount(Number(e.target.value))
                      }
                      className="mt-2 w-full accent-indigo-600"
                    />
                    <div className="mt-1 flex justify-between text-xs text-slate-400">
                      <span>1</span>
                      <span>50</span>
                    </div>
                  </div>

                  {/* Average Salary */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">
                        Average agent salary (annual)
                      </label>
                      <span className="text-sm font-bold text-slate-900">
                        {formatCurrency(avgAgentSalary)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={25000}
                      max={80000}
                      step={1000}
                      value={avgAgentSalary}
                      onChange={(e) =>
                        setAvgAgentSalary(Number(e.target.value))
                      }
                      className="mt-2 w-full accent-indigo-600"
                    />
                    <div className="mt-1 flex justify-between text-xs text-slate-400">
                      <span>$25K</span>
                      <span>$80K</span>
                    </div>
                  </div>

                  {/* Missed After-Hours Calls */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">
                        Missed after-hours calls/month
                      </label>
                      <span className="text-sm font-bold text-slate-900">
                        {afterHoursMissedCalls}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={2000}
                      step={10}
                      value={afterHoursMissedCalls}
                      onChange={(e) =>
                        setAfterHoursMissedCalls(Number(e.target.value))
                      }
                      className="mt-2 w-full accent-indigo-600"
                    />
                    <div className="mt-1 flex justify-between text-xs text-slate-400">
                      <span>0</span>
                      <span>2,000</span>
                    </div>
                  </div>

                  {/* Revenue Per Missed Call */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">
                        Avg revenue lost per missed call
                      </label>
                      <span className="text-sm font-bold text-slate-900">
                        ${avgRevenuePerMissedCall}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1000}
                      step={10}
                      value={avgRevenuePerMissedCall}
                      onChange={(e) =>
                        setAvgRevenuePerMissedCall(Number(e.target.value))
                      }
                      className="mt-2 w-full accent-indigo-600"
                    />
                    <div className="mt-1 flex justify-between text-xs text-slate-400">
                      <span>$0</span>
                      <span>$1,000</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-6">
                {/* Main Savings */}
                <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-8">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Estimated Annual Savings
                  </h2>
                  <div className="mt-4 text-5xl font-bold text-green-600">
                    {formatCurrency(results.annualSavings)}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {results.savingsPercentage}% reduction in customer
                    communication costs
                  </p>

                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-white p-4 border border-green-100">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        Monthly Savings
                      </div>
                      <div className="mt-1 text-xl font-bold text-slate-900">
                        {formatCurrency(results.monthlySavings)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white p-4 border border-green-100">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        Recovered Revenue/mo
                      </div>
                      <div className="mt-1 text-xl font-bold text-slate-900">
                        {formatCurrency(results.recoveredRevenue)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Before/After */}
                <div className="rounded-2xl border border-slate-200 bg-white p-8">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Before vs. After CallSphere
                  </h3>
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3">
                      <span className="text-sm text-slate-700">
                        Current monthly cost
                      </span>
                      <span className="font-bold text-red-600">
                        {formatCurrency(results.currentMonthlyCost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-3">
                      <span className="text-sm text-slate-700">
                        With CallSphere ({results.planName} plan)
                      </span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(results.newMonthlyCost)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-200 pt-6">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="flex items-center justify-center gap-1 text-sm text-slate-600">
                          <Phone className="h-3.5 w-3.5" />
                          Calls handled by AI
                        </div>
                        <div className="mt-1 text-lg font-bold text-indigo-600">
                          {results.aiHandledCalls.toLocaleString()}/mo
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1 text-sm text-slate-600">
                          <Clock className="h-3.5 w-3.5" />
                          Agents needed
                        </div>
                        <div className="mt-1 text-lg font-bold text-indigo-600">
                          {results.reducedAgentCount} (was{" "}
                          {currentAgentCount})
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    Recommended plan:{" "}
                    <strong>
                      {results.planName} ({formatCurrency(results.planCost)}
                      /mo)
                    </strong>
                  </p>
                  <Link
                    href="/contact"
                    className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Book a Demo to Validate These Numbers
                    <ArrowRight aria-hidden className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Methodology Note */}
            <div className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-sm font-semibold text-slate-700">
                Calculation Methodology
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                This calculator assumes 85% of calls can be handled by AI
                voice agents based on industry averages. Actual results vary
                by industry, call complexity, and implementation. Recovered
                revenue assumes 80% of previously missed after-hours calls
                are captured by 24/7 AI coverage. Labor savings are estimated
                based on reduced staffing needs. Contact us for a
                personalized ROI analysis based on your specific call data.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
