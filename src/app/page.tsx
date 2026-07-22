'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from '@/lib/ultis';
import { CalendarDays, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { revenueApi, RevenueChartPoint, RevenueChartResponse } from '@/api';

type ChartMode = 'hour' | 'day' | 'month' | 'year' | 'years';

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
        dateStr: `${vn.getFullYear()}-${String(vn.getMonth() + 1).padStart(2, '0')}-${String(vn.getDate()).padStart(2, '0')}`,
    };
};

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

    // Mặc định: mở vào sẽ thấy doanh thu từng giờ của NGÀY HÔM NAY (theo giờ VN)
    const [mode, setMode] = useState<ChartMode>('hour');
    const [year, setYear] = useState<number>(() => vnToday().year);
    const [month, setMonth] = useState<string>(() => {
        const t = vnToday();
        return `${t.year}-${String(t.month).padStart(2, '0')}`;
    });
    const [date, setDate] = useState<string>(() => vnToday().dateStr);

    const [chart, setChart] = useState<RevenueChartResponse | null>(null);
    const [chartLoading, setChartLoading] = useState(true);
    const [chartError, setChartError] = useState<string | null>(null);

    useEffect(() => {
        const userId = getCookie('userId');
        const userName = getCookie('userName');
        const role = getCookie('role');

        // Nếu user 'thin1' có role 'admin company' → xóa toàn bộ session & redirect login
        if (userName === 'thin1' && role === 'admin company') {
            const cookies = ['userId', 'userName', 'role', 'name', 'companyId', 'companyName', 'department', 'token', 'isSuperAdmin'];
            cookies.forEach(c => { document.cookie = `${c}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`; });
            try { localStorage.clear(); } catch {}
            router.push('/login/company');
            return;
        }

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
                const params = (() => {
                    if (mode === 'hour' || mode === 'day') return { mode, date };
                    if (mode === 'month') return { mode, year, month };
                    if (mode === 'year') return { mode, year };
                    return { mode, year };
                })();
                const data = await revenueApi.getChart(params);
                setChart(data);
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu doanh thu';
                setChartError(msg);
            } finally {
                setChartLoading(false);
            }
        };
        fetchChart();
    }, [mode, year, month, date, isCheckingAuth]);

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

    const highestLabel =
        mode === 'hour'
            ? 'Giờ cao nhất'
            : mode === 'day'
                ? 'Ngày'
                : mode === 'month'
                    ? 'Ngày cao nhất'
                    : 'Tháng/Năm cao nhất';

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-50/50">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-200">
                            <TrendingUp className="h-6 w-6" strokeWidth={2.4} />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Dashboard doanh thu</h1>
                            <p className="text-sm text-gray-500 font-medium mt-1">Theo dõi doanh thu theo giờ / ngày / tháng / năm từ các đơn hàng</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-50/50">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-5">
                    <div>
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">Biểu đồ doanh thu</h2>
                        <p className="text-xs text-gray-500 mt-1">Tổng tiền hàng theo các đơn hàng trong khoảng đã chọn</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                            {([
                                { v: 'hour', label: 'Theo giờ' },
                                { v: 'day', label: 'Theo ngày' },
                                { v: 'month', label: 'Theo tháng' },
                                { v: 'year', label: 'Theo năm' },
                                { v: 'years', label: 'Theo 10 năm' },
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

                        {(mode === 'hour' || mode === 'day') && (
                            <div className="relative">
                                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (!val) return;
                                        setDate(val);
                                    }}
                                    className="pl-9 pr-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400"
                                />
                            </div>
                        )}

                        {mode === 'month' && (
                            <MonthYearPicker
                                year={year}
                                month={month}
                                onYearChange={setYear}
                                onMonthChange={(m) => setMonth(`${year}-${m}`)}
                            />
                        )}

                        {(mode === 'year' || mode === 'years') && (
                            <YearSelector value={year} onChange={setYear} />
                        )}
                    </div>
                </div>

                {summary && !chartLoading && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                        <SummaryStat label="Tổng doanh thu" value={formatFullVnd(summary.total)} accent="orange" />
                        <SummaryStat label="Đã thu" value={formatFullVnd(summary.paid)} accent="emerald" />
                        <SummaryStat label="Tổng đơn" value={`${summary.orderCount}`} accent="blue" />
                        <SummaryStat
                            label={highestLabel}
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
    const map: Record<string, { border: string; bg: string; text: string; sub: string }> = {
        orange: { border: 'border-orange-200', bg: 'bg-gradient-to-br from-orange-50 to-white', text: 'text-orange-700', sub: 'text-orange-900' },
        emerald: { border: 'border-emerald-200', bg: 'bg-gradient-to-br from-emerald-50 to-white', text: 'text-emerald-700', sub: 'text-emerald-900' },
        blue: { border: 'border-blue-200', bg: 'bg-gradient-to-br from-blue-50 to-white', text: 'text-blue-700', sub: 'text-blue-900' },
        violet: { border: 'border-violet-200', bg: 'bg-gradient-to-br from-violet-50 to-white', text: 'text-violet-700', sub: 'text-violet-900' },
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

function MonthYearPicker({
    year,
    month,
    onYearChange,
    onMonthChange,
}: {
    year: number;
    month: string; // yyyy-MM
    onYearChange: (y: number) => void;
    onMonthChange: (m: string) => void;
}) {
    const today = vnToday();
    const minYear = today.year - 9;
    const years: number[] = [];
    for (let y = today.year; y >= minYear; y--) years.push(y);
    const months = [
        { v: '01', label: 'Tháng 1' }, { v: '02', label: 'Tháng 2' }, { v: '03', label: 'Tháng 3' },
        { v: '04', label: 'Tháng 4' }, { v: '05', label: 'Tháng 5' }, { v: '06', label: 'Tháng 6' },
        { v: '07', label: 'Tháng 7' }, { v: '08', label: 'Tháng 8' }, { v: '09', label: 'Tháng 9' },
        { v: '10', label: 'Tháng 10' }, { v: '11', label: 'Tháng 11' }, { v: '12', label: 'Tháng 12' },
    ];
    const currentMonth = month?.split('-')[1] ?? String(today.month).padStart(2, '0');
    return (
        <div className="flex items-center gap-2">
            <select
                value={month}
                onChange={(e) => onMonthChange(e.target.value)}
                className="px-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400"
            >
                {months.map((m) => (
                    <option key={m.v} value={`${year}-${m.v}`}>{m.label}</option>
                ))}
            </select>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onYearChange(year - 1)}
                    disabled={year <= minYear}
                    className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    aria-label="Năm trước"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <select
                    value={year}
                    onChange={(e) => onYearChange(Number(e.target.value))}
                    className="px-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400"
                >
                    {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={() => onYearChange(year + 1)}
                    disabled={year >= today.year}
                    className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    aria-label="Năm sau"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

// Path bo tròn CHỈ ở 2 đỉnh trên, đáy phẳng
function topRoundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
    const rr = Math.max(0, Math.min(r, w / 2, h));
    if (h <= 0) return '';
    if (h <= rr) {
        // Bar quá ngắn để bo → trả về hình elip ở phần trên
        return `M ${x} ${y + h}
                L ${x} ${y + rr}
                Q ${x} ${y} ${x + rr} ${y}
                L ${x + w - rr} ${y}
                Q ${x + w} ${y} ${x + w} ${y + rr}
                L ${x + w} ${y + h} Z`;
    }
    return `M ${x} ${y + h}
            L ${x} ${y + rr}
            Q ${x} ${y} ${x + rr} ${y}
            L ${x + w - rr} ${y}
            Q ${x + w} ${y} ${x + w} ${y + rr}
            L ${x + w} ${y + h} Z`;
}

function ColumnChart({ points, loading }: { points: RevenueChartPoint[]; loading: boolean }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);
    const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
    const [box, setBox] = useState<{ left: number; top: number; scale: number } | null>(null);

    // Kích thước viewBox cố định
    const width = 800;
    const height = 340;
    const padding = { top: 24, right: 24, bottom: 36, left: 64 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;
    const gradId = 'column-gradient';

    // Cập nhật tỉ lệ thực tế của SVG để quy đổi toạ độ viewBox → pixel
    useEffect(() => {
        const update = () => {
            const svg = svgRef.current;
            const container = containerRef.current;
            if (!svg || !container) return;
            const rect = svg.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const scale = rect.width / width;
            setBox({
                left: rect.left - containerRect.left,
                top: rect.top - containerRect.top,
                scale,
            });
        };
        update();
        const ro = new ResizeObserver(update);
        if (svgRef.current) ro.observe(svgRef.current);
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            ro.disconnect();
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [width]);

    const handleMove = (e: React.MouseEvent<SVGRectElement>, idx: number) => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setHoverIdx(idx);
    };

    const handleLeave = () => {
        setHoverIdx(null);
        setTooltipPos(null);
    };

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
    const tickMax = rawMax > 0 ? Math.ceil(rawMax / step) * step : step;
    const tickCount = 5;

    const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (tickMax / tickCount) * i);

    const barCount = points.length;
    const gapRatio = barCount <= 12 ? 0.4 : barCount <= 24 ? 0.32 : barCount <= 31 ? 0.28 : 0.22;
    const slotW = innerW / barCount;
    const barW = Math.max(2, slotW * (1 - gapRatio));
    const cornerRadius = Math.min(barW / 2, 6);

    const labelStep = Math.max(1, Math.ceil(barCount / 12));

    const hovered = hoverIdx !== null ? points[hoverIdx] : null;
    const hoverBarCenterX = hoverIdx !== null && box
        ? box.left + (padding.left + hoverIdx * slotW + slotW / 2) * box.scale
        : 0;
    const hoverBarTopY = hoverIdx !== null && box && points[hoverIdx].totalPrice > 0
        ? box.top + (padding.top + innerH - (points[hoverIdx].totalPrice / tickMax) * innerH) * box.scale
        : 0;

    return (
        <div ref={containerRef} className="relative w-full overflow-x-auto -mx-2 px-2">
            <svg
                ref={svgRef}
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

                {points.map((p, i) => {
                    const hasValue = p.totalPrice > 0;
                    const slotX = padding.left + i * slotW;
                    const x = slotX + (slotW - barW) / 2;
                    const h = hasValue ? (p.totalPrice / tickMax) * innerH : 0;
                    const y = padding.top + innerH - h;
                    const showLabel = i % labelStep === 0 || i === barCount - 1;
                    const path = hasValue
                        ? topRoundedRectPath(x, y, barW, Math.max(h, 1), cornerRadius)
                        : '';
                    return (
                        <g key={p.key}>
                            {/* Vùng bắt hover phủ cả slot — để dễ bắt khi bar hẹp */}
                            <rect
                                x={slotX}
                                y={padding.top}
                                width={slotW}
                                height={innerH}
                                fill={hoverIdx === i ? 'rgba(251, 146, 60, 0.06)' : 'transparent'}
                                onMouseEnter={(e) => handleMove(e, i)}
                                onMouseMove={(e) => handleMove(e, i)}
                                onMouseLeave={handleLeave}
                                style={{ cursor: 'pointer' }}
                            />
                            {hasValue && (
                                <path
                                    d={path}
                                    fill={hoverIdx === i ? '#ea580c' : `url(#${gradId})`}
                                    pointerEvents="none"
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

                <line
                    x1={padding.left}
                    y1={padding.top + innerH}
                    x2={padding.left + innerW}
                    y2={padding.top + innerH}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                />

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

            {hovered && tooltipPos && box && (
                <ChartTooltip
                    point={hovered}
                    mouseX={tooltipPos.x}
                    mouseY={tooltipPos.y}
                    anchorX={hoverBarCenterX}
                    anchorY={hoverBarTopY}
                />
            )}
        </div>
    );
}

function ChartTooltip({
    point,
    mouseX,
    mouseY,
    anchorX,
    anchorY,
}: {
    point: RevenueChartPoint;
    mouseX: number;
    mouseY: number;
    anchorX: number;
    anchorY: number;
}) {
    // Đặt tooltip phía trên đỉnh cột (anchorY), căn giữa theo cột.
    // Nếu tràn mép trái/phải container thì clamp.
    const OFFSET_Y = 12;
    const TOOLTIP_W = 240;
    const TOOLTIP_H = 132;

    const containerWidth = typeof window !== 'undefined' ? window.innerWidth : 0;

    let left = anchorX - TOOLTIP_W / 2;
    let top = anchorY - TOOLTIP_H - OFFSET_Y;

    // Nếu không đủ chỗ phía trên → hiển thị phía dưới cột
    if (top < 8) {
        top = anchorY + OFFSET_Y + 40; // 40 ≈ chiều cao bar kéo dài tới baseline
    }

    // Clamp ngang
    const minLeft = 8;
    const maxLeft = containerWidth > 0 ? containerWidth - TOOLTIP_W - 8 : left;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;

    return (
        <div
            className="pointer-events-none absolute z-20 w-[240px] rounded-2xl bg-white border border-gray-200 shadow-2xl shadow-gray-200/80 px-3 py-2.5 text-sm"
            style={{ left, top }}
        >
            <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                    {point.label}
                </span>
                <span className="text-[11px] font-bold text-gray-500">
                    {point.orderCount} đơn
                </span>
            </div>
            <div className="flex items-center justify-between gap-2 py-1">
                <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />
                    <span className="text-xs font-bold text-gray-600">Doanh thu</span>
                </div>
                <span className="text-sm font-black text-gray-900 tabular-nums">
                    {formatFullVnd(point.totalPrice)}
                </span>
            </div>
            <div className="flex items-center justify-between gap-2 py-1 border-t border-gray-100">
                <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-gray-600">Đã thu</span>
                </div>
                <span className="text-sm font-black text-gray-900 tabular-nums">
                    {formatFullVnd(point.amountCustomerPayment)}
                </span>
            </div>
        </div>
    );
}