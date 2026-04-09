"use client";

import type { GeneratedScentProfile } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

type PurchaseSheetProps = {
  open: boolean;
  profile: GeneratedScentProfile | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function PurchaseSheet({ open, profile, onClose, onConfirm }: PurchaseSheetProps) {
  if (!open || !profile) {
    return null;
  }

  return (
    <div className="sheet-backdrop fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(27,28,26,0.22)] p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close purchase sheet"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="sheet-panel relative z-[71] w-full max-w-2xl overflow-hidden rounded-[2rem] bg-surface shadow-[0_35px_90px_rgba(78,69,60,0.22)]">
        <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(185,236,238,0.55),transparent_70%)]" />
        <div className="relative space-y-6 p-6 md:p-8">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.32em] text-tertiary">购买确认</p>
            <h3 className="font-headline text-3xl text-foreground md:text-4xl">{profile.productName}</h3>
            <p className="max-w-xl text-sm leading-7 text-muted">
              先确认这支方案方向没问题，再进入付款页。你可以直接以访客身份下单，不需要先登录。
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.5rem] bg-surface-low p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-outline">方案摘要</p>
              <p className="mt-3 text-sm leading-7 text-muted">{profile.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.scentTags.slice(0, 4).map((tag) => (
                  <span key={tag} className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-muted">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-primary/8 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-outline">结算信息</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm text-muted">
                  <span>方案价格</span>
                  <span>{formatPrice(profile.price)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted">
                  <span>预计运费</span>
                  <span>{formatPrice(18)}</span>
                </div>
                <div className="border-t border-outline-variant/20 pt-3">
                  <div className="flex items-end justify-between">
                    <span className="font-headline text-xl text-foreground">预计合计</span>
                    <span className="font-headline text-2xl text-primary">{formatPrice(profile.price + 18)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-surface-high px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-surface-highest"
            >
              再看看方案
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-full bg-gradient-to-br from-primary to-primary-soft px-6 py-3 text-sm font-semibold text-white shadow-ambient transition hover:translate-y-[-1px]"
            >
              进入付款页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
