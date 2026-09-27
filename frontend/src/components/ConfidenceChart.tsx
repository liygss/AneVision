import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ConfidenceChartProps {
  eyeConfidence: number;
  nailConfidence?: number | null;
  combinedConfidence: number;
}

export default function ConfidenceChart({
  eyeConfidence,
  nailConfidence,
  combinedConfidence,
}: ConfidenceChartProps) {
  const data = [
    { name: "Model Mata", value: eyeConfidence * 100, fill: "#0891b2" },
    ...(nailConfidence != null
      ? [{ name: "Model Kuku", value: nailConfidence * 100, fill: "#0e7490" }]
      : []),
    { name: "Gabungan", value: combinedConfidence * 100, fill: "#155e75" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-2xl border border-navy-100/80 shadow-sm p-6"
    >
      <h4 className="text-sm font-bold text-navy-800 mb-4">Tingkat Keyakinan Model</h4>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#627d98", fontFamily: "Plus Jakarta Sans, sans-serif" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#627d98" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(value: any) => [`${Number(value).toFixed(1)}%`, "Keyakinan"]}
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                fontSize: "13px",
                fontFamily: "Plus Jakarta Sans, sans-serif",
                padding: "8px 12px",
              }}
              cursor={{ fill: "rgba(8,145,178,0.04)" }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
