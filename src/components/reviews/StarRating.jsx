import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
function StarRating({ value, onChange, size = 40, readOnly = false }) {
  return <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => <button
    key={n}
    type="button"
    disabled={readOnly}
    onClick={() => !readOnly && onChange?.(n)}
    className={cn(
      "transition-all duration-200 ease-out",
      !readOnly && "hover:scale-125 cursor-pointer active:scale-110",
      readOnly && "cursor-default"
    )}
    aria-label={`Rate ${n} star`}
  >
          <Star
    style={{ width: size, height: size }}
    className={cn(
      "transition-colors duration-200",
      n <= value ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" : "text-slate-600"
    )}
  />
        </button>)}
    </div>;
}
export {
  StarRating
};
