'use client';

import { useParams } from 'next/navigation';
import { HardTimeSlotDetail } from '../../_components/hard-time-slot-detail';

export default function HardTimeSlotPage() {
  const params = useParams<{ id: string }>();
  const slotId = Number(params.id);

  return <HardTimeSlotDetail slotId={slotId} />;
}
