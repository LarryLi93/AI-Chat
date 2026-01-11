
import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter
} from 'recharts';
import { BarChart2, LineChart as LineIcon, PieChart as PieIcon, LayoutPanelLeft, Hash, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ChartProps {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'horizontalBar' | 'metric';
  data: any[];
  title?: string;
  xAxis?: string;
  yAxis?: string;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#f43f5e'];

const MetricCard: React.FC<{ label: string; value: string | number; trend?: string }> = ({ label, value, trend }) => {
  const isPositive = trend?.startsWith('+');
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col gap-1 min-w-[140px] flex-1">
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
      <div className="flex items-end justify-between gap-2">
        <span className="text-xl font-bold text-gray-900 font-outfit">{value}</span>
        {trend && (
          <div className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {trend.replace('+', '').replace('-', '')}
          </div>
        )}
      </div>
    </div>
  );
};

export const ChartRenderer: React.FC<{ json: string }> = ({ json }) => {
  try {
    const config: ChartProps = JSON.parse(json);
    const [currentType, setCurrentType] = useState(config.type);
    const { data, title, xAxis, yAxis } = config;

    if (!data || !Array.isArray(data)) return <div className="p-4 text-xs text-red-400 bg-red-50 rounded-xl">Invalid chart data</div>;

    // Determine which types are compatible with the data
    const isStandardData = data.length > 0 && 'name' in data[0] && 'value' in data[0];
    const isScatterData = data.length > 0 && 'x' in data[0] && 'y' in data[0];
    const isMetricData = config.type === 'metric' || (data.length > 0 && 'label' in data[0]);

    const renderChartContent = () => {
      switch (currentType) {
        case 'line':
          return (
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontSize: '12px' }} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 500 }} />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
            </LineChart>
          );
        case 'bar':
          return (
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontSize: '12px' }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
            </BarChart>
          );
        case 'horizontalBar':
          return (
            <BarChart layout="vertical" data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
              <YAxis type="category" dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} width={80} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontSize: '12px' }} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={24} />
            </BarChart>
          );
        case 'pie':
          return (
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontSize: '12px' }} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 500 }} />
            </PieChart>
          );
        case 'scatter':
          return (
            <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" dataKey="x" name={xAxis || 'x'} fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
              <YAxis type="number" dataKey="y" name={yAxis || 'y'} fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontSize: '12px' }} />
              <Scatter name="Data" data={data} fill="#3b82f6" fillOpacity={0.6} line={{ stroke: '#3b82f6', strokeWidth: 1 }} />
            </ScatterChart>
          );
        case 'metric':
          return (
            <div className="flex flex-wrap gap-3 py-2">
              {data.map((item, idx) => (
                <MetricCard key={idx} label={item.label || item.name} value={item.value} trend={item.trend} />
              ))}
            </div>
          );
        default:
          return null;
      }
    };

    const TypeButton: React.FC<{ type: ChartProps['type']; icon: React.ReactNode }> = ({ type, icon }) => (
      <button
        onClick={() => setCurrentType(type)}
        className={`p-2 rounded-xl transition-all duration-300 flex items-center justify-center ${
          currentType === type 
            ? 'bg-blue-500 text-white shadow-md shadow-blue-100' 
            : 'text-gray-400 hover:bg-white hover:text-gray-600 hover:shadow-sm'
        }`}
      >
        {icon}
      </button>
    );

    return (
      <div className="w-full bg-white rounded-[32px] border border-gray-100 p-6 my-6 shadow-[0_8px_40px_rgba(0,0,0,0.03)] animate-in fade-in zoom-in-95 duration-500">
        {/* Row 1: Title */}
        <div className="mb-4">
          {title && (
            <div className="flex flex-col gap-1">
              <h4 className="text-[16px] font-bold text-gray-900 font-outfit tracking-tight leading-tight">
                {title}
              </h4>
              <div className="w-8 h-0.5 bg-blue-500/20 rounded-full"></div>
            </div>
          )}
        </div>
        
        {/* Row 2: Type Switcher */}
        <div className="mb-6 flex">
          <div className="flex items-center bg-gray-50/80 rounded-2xl p-1 border border-gray-100/50">
            {isStandardData && (
              <>
                <TypeButton type="bar" icon={<BarChart2 size={16} />} />
                <TypeButton type="line" icon={<LineIcon size={16} />} />
                <TypeButton type="pie" icon={<PieIcon size={16} />} />
                <TypeButton type="horizontalBar" icon={<LayoutPanelLeft size={16} />} />
              </>
            )}
            {isScatterData && <TypeButton type="scatter" icon={<LineIcon size={16} />} />}
            {isMetricData && <TypeButton type="metric" icon={<Hash size={16} />} />}
          </div>
        </div>

        {/* Row 3: Chart Content */}
        <div className={currentType === 'metric' ? "w-full" : "h-[320px] w-full"}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChartContent() as React.ReactElement}
          </ResponsiveContainer>
        </div>
      </div>
    );
  } catch (e) {
    return (
      <div className="bg-red-50 text-red-500 p-6 rounded-[28px] text-xs font-medium my-4 border border-red-100/50 flex flex-col gap-2">
        <span className="font-bold uppercase tracking-widest text-[9px] opacity-60">Render Error</span>
        <p>Could not load visualization data.</p>
      </div>
    );
  }
};
