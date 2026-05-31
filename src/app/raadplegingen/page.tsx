import type { Metadata } from 'next';
import RaadplegingenClient from '@/components/RaadplegingenClient';
import './raadplegingen.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Raadplegingen — Communities Abroad',
  description: 'Lopende, permanente en voltooide raadplegingen.',
};

export default function RaadplegingenPage() {
  return <RaadplegingenClient />;
}
