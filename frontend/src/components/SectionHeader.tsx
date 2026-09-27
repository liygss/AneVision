import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  titleAccent?: string;
  lead?: string;
  className?: string;
}

export default function SectionHeader({
  eyebrow,
  title,
  titleAccent,
  lead,
  className,
}: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn("text-center mb-14", className)}
    >
      {eyebrow && (
        <span className="eyebrow">{eyebrow}</span>
      )}
      <h2 className="section-title">
        {title}
        {titleAccent && (
          <>
            <br className="hidden sm:block" />
            <span className="text-gradient">{titleAccent}</span>
          </>
        )}
      </h2>
      {lead && (
        <p className="section-lead">{lead}</p>
      )}
    </motion.div>
  );
}
