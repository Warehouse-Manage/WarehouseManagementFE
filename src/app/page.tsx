'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from '@/lib/ultis';
import { CalendarDays, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { revenueApi, RevenueChartPoint, RevenueChartResponse } from '@/api';

type ChartMode = 'day' | 'month' | 'year';

const formatVndShort = (value: number) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(value >= 10_000_000_000 ? 0 : 1)} tỷ`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)} tr`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
    return value.toLocaleString('en-US');
};

const formatFullVnd = (value: number) => `${value.toLocaleString('en-US')} đ`;

const vnToday = () => {
    const now = new Date();
    const vn = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    return {
        year: vn.getFullYear(),
        month: vn.getMonth() + 1,
        day: vn.getDate(),
    };
};

// Chọn bước "nice" cho trục Y — luôn ra số chẵn, dễ đọc (1, 2, 5, 10, 20, 50, ...)
const niceStep = (rawStep: number): number => {
    if (rawStep <= 0) return 1;
    const exp = Math.floor(Math.log10(rawStep));
    const fraction = rawStep / Math.pow(10, exp);
    let niceFraction: number;
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
    return niceFraction * Math.pow(10, exp);
};

export default function DashboardPage() {
    const router = useRouter();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    const [mode, setMode] = useState<ChartMode>('day');
    const [year, setYear] = useState<number>(() => vnToday().year);
    const [month, setMonth] = useState<string>(() => {
        const t = vnToday();
        return `${t.year}-${String(t.month).padStart(2, '0')}`;
    });

    const [chart, setChart] = useState<RevenueChartResponse | null>(null);
    const [chartLoading, setChartLoading] = useState(true);
    const [chartError, setChartError] = useState<string | null>(null);

    useEffect(() => {
        const userId = getCookie('userId');
        const userName = getCookie('userName');
        if (!userId || !userName) {
            router.push('/login/company');
            return;
        }
        setIsCheckingAuth(false);
    }, [router]);

    useEffect(() => {
        if (isCheckingAuth) return;
        const fetchChart = async () => {
            try {
                setChartLoading(true);
                setChartError(null);
                const data = await revenueApi.getChart({ mode, year, month: mode === 'day' ? month : undefined });
                setChart(data);
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu doanh thu';
                setChartError(msg);
            } finally {
                setChartLoading(false);
            }
        };
        fetchChart();
    }, [mode, year, month, isCheckingAuth]);

    const summary = useMemo(() => {
        if (!chart) return null;
        const total = chart.points.reduce((acc, p) => acc + p.totalPrice, 0);
        const paid = chart.points.reduce((acc, p) => acc + p.amountCustomerPayment, 0);
        const orderCount = chart.points.reduce((acc, p) => acc + p.orderCount, 0);
        const best = chart.points.reduce<RevenueChartPoint | null>(
            (best, p) => (best === null || p.totalPrice > best.totalPrice ? p : best),
            null,
        );
        return { total, paid, orderCount, best };
    }, [chart]);

    if (isCheckingAuth) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex items-center space-x-2 text-gray-600">
                    <svg className="animate-spin h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Đang kiểm tra xác thực...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-50/50">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-200">
                            <TrendingUp className="h-6 w-6" strokeWidth={2.4} />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Dashboard doanh thu</h1>
                            <p className="text-sm text-gray-500 font-medium mt-1">Theo dõi doanh thu theo ngày / tháng / năm từ các đơn hàng</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart card */}
            <div className="bg-white p-4 sm:p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-50/50">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-5">
                    <div>
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">Biểu đồ doanh thu</h2>
                        <p className="text-xs text-gray-500 mt-1">Tổng tiền hàng theo các đơn hàng trong khoảng đã chọn</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                            {([
                                { v: 'day', label: 'Theo ngày' },
                                { v: 'month', label: 'Theo tháng' },
                                { v: 'year', label: 'Theo năm' },
                            ] as { v: ChartMode; label: string }[]).map((opt) => {
                                const active = mode === opt.v;
                                return (
                                    <button
                                        key={opt.v}
                                        type="button"
                                        onClick={() => setMode(opt.v)}
                                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                                            active
                                                ? 'bg-white text-orange-700 shadow-sm border border-orange-100'
                                                : 'text-gray-500 hover:text-gray-700 border border-transparent'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>

                        {mode === 'day' && (
                            <div className="relative">
                                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="month"
                                    value={month}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (!val) return;
                                        const [yStr, mStr] = val.split('-');
                                        setYear(Number(yStr));
                                        setMonth(val);
                                    }}
                                    className="pl-9 pr-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400"
                                />
                            </div>
                        )}

                        {(mode === 'month' || mode === 'year') && (
                            <YearSelector value={year} onChange={setYear} />
                        )}
                    </div>
                </div>

                {summary && !chartLoading && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                        <SummaryStat label="Tổng doanh thu" value={formatFullVnd(summary.total)} accent="orange" />
                        <SummaryStat label="Đã thu" value={formatFullVnd(summary.paid)} accent="emerald" />
                        <SummaryStat
                            label="Tổng đơn"
                            value={`${summary.orderCount}`}
                            accent="blue"
                        />
                        <SummaryStat
                            label={mode === 'day' ? 'Ngày cao nhất' : mode === 'month' ? 'Tháng cao nhất' : 'Năm cao nhất'}
                            primary={summary.best && summary.best.totalPrice > 0 ? summary.best.label : '—'}
                            secondary={summary.best && summary.best.totalPrice > 0 ? formatVndShort(summary.best.totalPrice) : 'Chưa có dữ liệu'}
                            accent="violet"
                        />
                    </div>
                )}

                {chartError && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 font-bold text-sm mb-3">
                        {chartError}
                    </div>
                )}

                <ColumnChart points={chart?.points ?? []} loading={chartLoading} />
            </div>
        </div>
    );
}

function SummaryStat({
    label,
    value,
    primary,
    secondary,
    accent,
}: {
    label: string;
    value?: string;
    primary?: string;
    secondary?: string;
    accent: 'orange' | 'emerald' | 'blue' | 'violet';
}) {
    const map: Record<string, { border: string; bg: string; text: string; sub: string; badge: string }> = {
        orange: {
            border: 'border-orange-200',
            bg: 'bg-gradient-to-br from-orange-50 to-white',
            text: 'text-orange-700',
            sub: 'text-orange-900',
            badge: 'bg-orange-100 text-orange-700',
        },
        emerald: {
            border: 'border-emerald-200',
            bg: 'bg-gradient-to-br from-emerald-50 to-white',
            text: 'text-emerald-700',
            sub: 'text-emerald-900',
            badge: 'bg-emerald-100 text-emerald-700',
        },
        blue: {
            border: 'border-blue-200',
            bg: 'bg-gradient-to-br from-blue-50 to-white',
            text: 'text-blue-700',
            sub: 'text-blue-900',
            badge: 'bg-blue-100 text-blue-700',
        },
        violet: {
            border: 'border-violet-200',
            bg: 'bg-gradient-to-br from-violet-50 to-white',
            text: 'text-violet-700',
            sub: 'text-violet-900',
            badge: 'bg-violet-100 text-violet-700',
        },
    };
    const tone = map[accent];
    return (
        <div className={`border ${tone.border} ${tone.bg} rounded-2xl px-4 py-3.5 flex flex-col justify-center min-h-[88px]`}>
            <div className={`text-[11px] font-bold ${tone.text} uppercase tracking-wider mb-1`}>{label}</div>
            {value !== undefined && (
                <div className={`text-base sm:text-lg font-black tabular-nums ${tone.sub} truncate`} title={value}>{value}</div>
            )}
            {primary !== undefined && (
                <div className={`text-xl font-black ${tone.sub} tabular-nums leading-tight`}>{primary}</div>
            )}
            {secondary !== undefined && (
                <div className={`text-xs font-bold ${tone.text} mt-0.5`}>{secondary}</div>
            )}
        </div>
    );
}

function YearSelector({ value, onChange }: { value: number; onChange: (y: number) => void }) {
    const today = vnToday();
    const minYear = today.year - 9;
    const options: number[] = [];
    for (let y = today.year; y >= minYear; y--) options.push(y);
    return (
        <div className="flex items-center gap-1">
            <button
                type="button"
                onClick={() => onChange(value - 1)}
                disabled={value <= minYear}
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Năm trước"
            >
                <ChevronLeft className="h-4 w-4" />
            </button>
            <select
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="px-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400"
            >
                {options.map((y) => (
                    <option key={y} value={y}>{y}</option>
                ))}
            </select>
            <button
                type="button"
                onClick={() => onChange(value + 1)}
                disabled={value >= today.year}
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Năm sau"
            >
                <ChevronRight className="h-4 w-4" />
            </button>
        </div>
    );
}

function ColumnChart({ points, loading }: { points: RevenueChartPoint[]; loading: boolean }) {
    if (loading) {
        return (
            <div className="h-[340px] flex items-center justify-center text-gray-500">
                <svg className="animate-spin h-6 w-6 text-orange-500 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm font-medium">Đang tải dữ liệu...</span>
            </div>
        );
    }

    if (points.length === 0) {
        return (
            <div className="h-[340px] flex items-center justify-center text-gray-500 italic">
                Chưa có dữ liệu doanh thu trong khoảng đã chọn.
            </div>
        );
    }

    const rawMax = Math.max(...points.map((p) => p.totalPrice), 0);
    const rawStep = rawMax > 0 ? rawMax / 5 : 1;
    const step = Math.max(niceStep(rawStep), 1);
    // Làm tròn maxValue lên bội số của step, đảm bảo tick cao nhất ≥ max thực và là số chẵn
    const tickMax = rawMax > 0 ? Math.ceil(rawMax / step) * step : step;
    const tickCount = 5;

    const width = 800;
    const height = 340;
    const padding = { top: 24, right: 24, bottom: 36, left: 64 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (tickMax / tickCount) * i);

    const barCount = points.length;
    const gapRatio = barCount <= 12 ? 0.4 : barCount <= 31 ? 0.3 : 0.22;
    const slotW = innerW / barCount;
    const barW = Math.max(2, slotW * (1 - gapRatio));

    const labelStep = Math.max(1, Math.ceil(barCount / 12));

    // Gradient định nghĩa 1 lần, dùng url(#...)
    const gradId = 'column-gradient';

    return (
        <div className="w-full overflow-x-auto -mx-2 px-2">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-auto min-w-[640px]"
                role="img"
                aria-label="Biểu đồ cột doanh thu"
            >
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fb923c" />
                        <stop offset="100%" stopColor="#f97316" />
                    </linearGradient>
                </defs>

                {/* Grid ngang + trục Y */}
                {ticks.map((t, i) => {
                    const y = padding.top + innerH - (t / tickMax || 0) * innerH;
                    return (
                        <g key={`grid-${i}`}>
                            <line
                                x1={padding.left}
                                y1={y}
                                x2={padding.left + innerW}
                                y2={y}
                                stroke="#f3f4f6"
                                strokeWidth={1}
                            />
                            <text
                                x={padding.left - 8}
                                y={y + 4}
                                textAnchor="end"
                                className="fill-gray-500"
                                fontSize={11}
                                fontWeight={500}
                            >
                                {formatVndShort(t)}
                            </text>
                        </g>
                    );
                })}

                {/* Bars */}
                {points.map((p, i) => {
                    const hasValue = p.totalPrice > 0;
                    const slotX = padding.left + i * slotW;
                    const x = slotX + (slotW - barW) / 2;
                    const h = hasValue ? (p.totalPrice / tickMax) * innerH : 0;
                    const y = padding.top + innerH - h;
                    const showLabel = i % labelStep === 0 || i === barCount - 1;
                    return (
                        <g key={p.key}>
                            {/* Hover overlay phủ toàn slot */}
                            <rect
                                x={slotX}
                                y={padding.top}
                                width={slotW}
                                height={innerH}
                                fill="transparent"
                            >
                                <title>
                                    {`${p.label} • ${p.orderCount} đơn • Doanh thu: ${formatFullVnd(p.totalPrice)} • Đã thu: ${formatFullVnd(p.amountCustomerPayment)}`}
                                </title>
                            </rect>
                            {/* Chỉ vẽ cột khi có giá trị — không vẽ "vệt" cho giá trị 0 */}
                            {hasValue && (
                                <rect
                                    x={x}
                                    y={y}
                                    width={barW}
                                    height={Math.max(h, 1)}
                                    rx={barW >= 6 ? 6 : 3}
                                    ry={barW >= 6 ? 6 : 3}
                                    fill={`url(#${gradId})`}
                                />
                            )}
                            {showLabel && (
                                <text
                                    x={slotX + slotW / 2}
                                    y={padding.top + innerH + 18}
                                    textAnchor="middle"
                                    className="fill-gray-500"
                                    fontSize={11}
                                    fontWeight={500}
                                >
                                    {p.label}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* Trục X */}
                <line
                    x1={padding.left}
                    y1={padding.top + innerH}
                    x2={padding.left + innerW}
                    y2={padding.top + innerH}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                />

                {/* Trục Y label */}
                <text
                    x={14}
                    y={padding.top + innerH / 2}
                    transform={`rotate(-90 14 ${padding.top + innerH / 2})`}
                    textAnchor="middle"
                    className="fill-gray-400"
                    fontSize={11}
                    fontWeight={600}
                >
                    Doanh thu
                </text>
            </svg>
        </div>
    );
}