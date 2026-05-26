'use client';

import { canAccessAccounting } from '@/lib/roles';
import { getCookie } from '@/lib/ultis';
import { Activity, Box, Flame, Layers, Package, TrainFront, Wind } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

type LaneId = 'hook-rail' | 'drying' | 'firing';

interface KilnWagon {
  id: string;
  code: string;
  packages: number;
  note?: string;
  progress?: number;
}

interface KilnSystemSnapshot {
  extruder: {
    status: 'running' | 'idle' | 'maintenance';
    outputToday: number;
    speed: string;
  };
  stacking: KilnWagon[];
  lanes: Record<LaneId, KilnWagon[]>;
}

type ColorTheme = {
  shell: string;
  icon: string;
  accent: string;
  badge: string;
  stat: string;
  progress: string;
  wagon: string;
  progressTrack: string;
};

const MOCK_SNAPSHOT: KilnSystemSnapshot = {
  extruder: {
    status: 'running',
    outputToday: 1240,
    speed: 'Ổn định',
  },
  stacking: [
    { id: 's1', code: 'G-104', packages: 8, note: 'Đang xếp', progress: 65 },
    { id: 's2', code: 'G-105', packages: 0, note: 'Chờ xếp', progress: 12 },
  ],
  lanes: {
    'hook-rail': [
      { id: 'h1', code: 'G-101', packages: 12 },
      { id: 'h2', code: 'G-102', packages: 12 },
      { id: 'h3', code: 'G-103', packages: 11 },
    ],
    drying: [
      { id: 'd1', code: 'G-098', packages: 12, progress: 78 },
      { id: 'd2', code: 'G-099', packages: 12, progress: 42 },
    ],
    firing: [{ id: 'f1', code: 'G-095', packages: 12, progress: 91 }],
  },
};

const EXTRUDER_THEME: ColorTheme = {
  shell: 'border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-white to-white shadow-sm shadow-emerald-100/50',
  icon: 'bg-emerald-100 text-emerald-700',
  accent: 'text-emerald-600',
  badge: 'bg-emerald-600 text-white',
  stat: 'border-emerald-100/80 bg-emerald-50/60',
  progress: 'bg-emerald-500',
  wagon: 'border-emerald-200/80 bg-emerald-100/55',
  progressTrack: 'bg-emerald-200/50',
};

const STACKING_THEME: ColorTheme = {
  shell: 'border-violet-200/90 bg-gradient-to-br from-violet-50 via-white to-white shadow-sm shadow-violet-100/50',
  icon: 'bg-violet-100 text-violet-700',
  accent: 'text-violet-600',
  badge: 'bg-violet-600 text-white',
  stat: 'border-violet-100/80 bg-violet-50/60',
  progress: 'bg-violet-500',
  wagon: 'border-violet-200/80 bg-violet-100/55',
  progressTrack: 'bg-violet-200/50',
};

const LANES: {
  id: LaneId;
  title: string;
  subtitle: string;
  icon: ReactNode;
  theme: ColorTheme;
}[] = [
  {
    id: 'hook-rail',
    title: 'Ray móc',
    subtitle: 'Vận chuyển & treo goòng',
    icon: <TrainFront className="h-5 w-5" />,
    theme: {
      shell: 'border-sky-200/90 bg-gradient-to-b from-sky-50/90 via-white to-white shadow-sm shadow-sky-100/40',
      icon: 'bg-sky-100 text-sky-700',
      accent: 'text-sky-600',
      badge: 'bg-sky-100 text-sky-800',
      stat: 'border-sky-100 bg-sky-50/50',
      progress: 'bg-sky-500',
      wagon: 'border-sky-200/80 bg-sky-100/60',
      progressTrack: 'bg-sky-200/50',
    },
  },
  {
    id: 'drying',
    title: 'Lò sấy',
    subtitle: 'Sấy khô gạch',
    icon: <Wind className="h-5 w-5" />,
    theme: {
      shell: 'border-amber-200/90 bg-gradient-to-b from-amber-50/90 via-white to-white shadow-sm shadow-amber-100/40',
      icon: 'bg-amber-100 text-amber-700',
      accent: 'text-amber-600',
      badge: 'bg-amber-100 text-amber-900',
      stat: 'border-amber-100 bg-amber-50/50',
      progress: 'bg-amber-500',
      wagon: 'border-amber-200/80 bg-amber-100/60',
      progressTrack: 'bg-amber-200/50',
    },
  },
  {
    id: 'firing',
    title: 'Lò đốt',
    subtitle: 'Nung hoàn thiện',
    icon: <Flame className="h-5 w-5" />,
    theme: {
      shell: 'border-rose-200/90 bg-gradient-to-b from-rose-50/90 via-white to-white shadow-sm shadow-rose-100/40',
      icon: 'bg-rose-100 text-rose-700',
      accent: 'text-rose-600',
      badge: 'bg-rose-100 text-rose-900',
      stat: 'border-rose-100 bg-rose-50/50',
      progress: 'bg-rose-500',
      wagon: 'border-rose-200/80 bg-rose-100/60',
      progressTrack: 'bg-rose-200/50',
    },
  },
];

function WagonCard({
  wagon,
  compact,
  theme,
}: {
  wagon: KilnWagon;
  compact?: boolean;
  theme: ColorTheme;
}) {
  return (
    <div
      className={`rounded-xl border p-2.5 shadow-sm sm:p-3 ${theme.wagon} ${compact ? '' : 'p-4'}`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400 sm:text-[10px]">Goòng</p>
          <p className="truncate text-sm font-black text-gray-900 sm:text-lg">{wagon.code}</p>
        </div>
        <Package className={`h-4 w-4 shrink-0 sm:h-5 sm:w-5 ${theme.accent}`} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs sm:text-sm">
        <span className="text-gray-500">Kiện</span>
        <span className="font-bold text-gray-900">{wagon.packages}</span>
      </div>
      {wagon.note && <p className="mt-1 truncate text-[10px] font-medium text-gray-500 sm:text-xs">{wagon.note}</p>}
      {wagon.progress !== undefined && (
        <div className="mt-2">
          <div className="mb-0.5 flex justify-between text-[9px] font-bold text-gray-400 sm:text-[10px]">
            <span>Tiến độ</span>
            <span>{wagon.progress}%</span>
          </div>
          <div className={`h-1.5 overflow-hidden rounded-full ${theme.progressTrack}`}>
            <div className={`h-full rounded-full ${theme.progress}`} style={{ width: `${wagon.progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function LaneColumn({
  lane,
  wagons,
}: {
  lane: (typeof LANES)[number];
  wagons: KilnWagon[];
}) {
  const { theme } = lane;
  return (
    <section className={`flex min-h-[360px] flex-col rounded-2xl border ${theme.shell}`}>
      <header className="border-b border-white/60 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${theme.icon}`}>{lane.icon}</span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-gray-900 sm:text-base">{lane.title}</h3>
            <p className="truncate text-[10px] text-gray-500 sm:text-xs">{lane.subtitle}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold sm:text-xs ${theme.badge}`}>
            {wagons.length}
          </span>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {wagons.length === 0 ? (
          <div
            className={`flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center ${theme.wagon} opacity-70`}
          >
            <Layers className="mb-1 h-6 w-6 text-gray-300" />
            <p className="text-xs font-semibold text-gray-400">Chưa có goòng</p>
          </div>
        ) : (
          wagons.map((w) => <WagonCard key={w.id} wagon={w} theme={theme} />)
        )}
      </div>
    </section>
  );
}

export default function KilnSystemPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [snapshot] = useState<KilnSystemSnapshot>(MOCK_SNAPSHOT);

  useEffect(() => {
    const userId = getCookie('userId');
    const userName = getCookie('userName');
    const role = getCookie('role');

    if (!userId || !userName) {
      router.push('/login');
      return;
    }
    if (!canAccessAccounting(role)) {
      router.push('/');
      return;
    }
    setIsCheckingAuth(false);
  }, [router]);

  const extruderStatus = useMemo(() => {
    const map = {
      running: { label: 'Đang chạy', className: EXTRUDER_THEME.badge },
      idle: { label: 'Tạm dừng', className: 'bg-gray-300 text-gray-700' },
      maintenance: { label: 'Bảo trì', className: 'bg-amber-500 text-white' },
    };
    return map[snapshot.extruder.status];
  }, [snapshot.extruder.status]);

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <article className={`flex flex-col rounded-2xl border p-3 sm:p-5 ${EXTRUDER_THEME.shell}`}>
          <div className="flex items-start justify-between gap-1">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${EXTRUDER_THEME.icon}`}
              >
                <Box className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-xs font-black text-gray-900 sm:text-lg">Máy đùn</h2>
                <p className="hidden text-xs text-gray-500 sm:block">Khu đùn & cấp liệu</p>
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold sm:px-2.5 sm:py-1 sm:text-xs ${extruderStatus.className}`}
            >
              {extruderStatus.label}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
            <div className={`rounded-xl border p-2 sm:p-3 ${EXTRUDER_THEME.stat}`}>
              <p className="text-[9px] font-bold uppercase text-gray-500 sm:text-[10px]">SL hôm nay</p>
              <p className="mt-0.5 text-base font-black text-emerald-800 sm:text-xl">
                {snapshot.extruder.outputToday.toLocaleString('vi-VN')}
              </p>
            </div>
            <div className={`rounded-xl border p-2 sm:p-3 ${EXTRUDER_THEME.stat}`}>
              <p className="text-[9px] font-bold uppercase text-gray-500 sm:text-[10px]">Tốc độ</p>
              <p className="mt-0.5 flex items-center gap-1 text-sm font-black text-gray-900 sm:text-lg">
                <Activity className="h-3.5 w-3.5 text-emerald-600 sm:h-4 sm:w-4" />
                <span className="truncate">{snapshot.extruder.speed}</span>
              </p>
            </div>
          </div>
        </article>

        <article className={`flex flex-col rounded-2xl border p-3 sm:p-5 ${STACKING_THEME.shell}`}>
          <div className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${STACKING_THEME.icon}`}
            >
              <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-xs font-black text-gray-900 sm:text-lg">Goòng xếp</h2>
              <p className="text-[10px] text-violet-600/80 sm:text-xs">{snapshot.stacking.length} goòng</p>
            </div>
          </div>
          <div className="mt-2 flex flex-1 flex-col gap-2 overflow-y-auto sm:mt-3">
            {snapshot.stacking.map((wagon) => (
              <WagonCard key={wagon.id} wagon={wagon} compact theme={STACKING_THEME} />
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
        {LANES.map((lane) => (
          <LaneColumn key={lane.id} lane={lane} wagons={snapshot.lanes[lane.id]} />
        ))}
      </div>

      <p className="text-center text-[10px] text-gray-400 sm:text-xs">
        Dữ liệu mẫu — sẽ kết nối IoT / API khi backend sẵn sàng.
      </p>
    </div>
  );
}
