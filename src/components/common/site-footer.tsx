'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

function PolicyDialog({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-lg">{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <div className="text-sm text-muted-foreground space-y-4 pb-4">
            {children}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function SiteFooter() {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  return (
    <>
      <footer className="w-full border-t border-border/20 py-3 px-6 flex items-center justify-center gap-4 text-[11px] text-muted-foreground/60">
        <span>© {new Date().getFullYear()} HTBase. All rights reserved.</span>
        <span className="text-border/40">·</span>
        <button
          onClick={() => setPrivacyOpen(true)}
          className="hover:text-muted-foreground transition-colors underline-offset-2 hover:underline"
        >
          Privacy Policy
        </button>
        <span className="text-border/40">·</span>
        <button
          onClick={() => setTermsOpen(true)}
          className="hover:text-muted-foreground transition-colors underline-offset-2 hover:underline"
        >
          Terms of Use
        </button>
      </footer>

      <PolicyDialog open={privacyOpen} onOpenChange={setPrivacyOpen} title="Privacy Policy">
        <p className="text-xs text-muted-foreground/50">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p>HTBase ("we," "us," or "our") operates this platform as an internal business management tool. This Privacy Policy describes how we collect, use, and protect information in connection with your use of the platform.</p>
        <h3 className="text-foreground font-semibold mt-4">Information We Collect</h3>
        <p>We collect information you provide directly, including account credentials, business data, customer records, training session data, and any other content you enter into the platform. We may also collect usage data such as login times, feature interactions, and device information.</p>
        <h3 className="text-foreground font-semibold mt-4">How We Use Your Information</h3>
        <p>Information collected is used solely to provide, maintain, and improve the HTBase platform for your organization. We do not sell, rent, or share your data with third parties except as necessary to operate the service (e.g., Firebase for data storage, Google Maps for location features).</p>
        <h3 className="text-foreground font-semibold mt-4">Data Storage & Security</h3>
        <p>Your data is stored securely using Google Firebase infrastructure. We implement reasonable technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction.</p>
        <h3 className="text-foreground font-semibold mt-4">Data Retention</h3>
        <p>We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your data by contacting your account administrator.</p>
        <h3 className="text-foreground font-semibold mt-4">Third-Party Services</h3>
        <p>This platform integrates with third-party services including Google Firebase, Google Maps, and Google Gemini AI. Use of these services is subject to their respective privacy policies.</p>
        <h3 className="text-foreground font-semibold mt-4">Contact</h3>
        <p>For privacy-related questions, contact us at service@huxleigh.com.</p>
      </PolicyDialog>

      <PolicyDialog open={termsOpen} onOpenChange={setTermsOpen} title="Terms of Use">
        <p className="text-xs text-muted-foreground/50">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p>By accessing or using HTBase, you agree to be bound by these Terms of Use. If you do not agree to these terms, do not use the platform.</p>
        <h3 className="text-foreground font-semibold mt-4">Permitted Use</h3>
        <p>HTBase is provided for authorized business use only. Access is granted to individuals who have been issued valid credentials by their organization's administrator. You agree not to share your credentials or allow unauthorized access to the platform.</p>
        <h3 className="text-foreground font-semibold mt-4">User Responsibilities</h3>
        <p>You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You agree to use the platform only for lawful business purposes and in compliance with all applicable laws and regulations.</p>
        <h3 className="text-foreground font-semibold mt-4">Prohibited Activities</h3>
        <p>You may not: (a) use the platform to store or transmit unlawful content; (b) attempt to gain unauthorized access to any part of the platform; (c) reverse engineer, decompile, or disassemble any component of the platform; (d) use the platform in any manner that could damage, disable, or impair its operation.</p>
        <h3 className="text-foreground font-semibold mt-4">Intellectual Property</h3>
        <p>All content, features, and functionality of HTBase are owned by Huxleigh Services and are protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without express written permission.</p>
        <h3 className="text-foreground font-semibold mt-4">Disclaimer of Warranties</h3>
        <p>HTBase is provided "as is" without warranties of any kind, express or implied. We do not warrant that the platform will be error-free, uninterrupted, or free of harmful components.</p>
        <h3 className="text-foreground font-semibold mt-4">Limitation of Liability</h3>
        <p>To the fullest extent permitted by law, Huxleigh Services shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform.</p>
        <h3 className="text-foreground font-semibold mt-4">Changes to Terms</h3>
        <p>We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the revised terms.</p>
        <h3 className="text-foreground font-semibold mt-4">Contact</h3>
        <p>For questions regarding these terms, contact us at service@huxleigh.com.</p>
      </PolicyDialog>
    </>
  );
}
