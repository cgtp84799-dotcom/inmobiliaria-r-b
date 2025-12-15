const themeTokens = theme === "dark"
  ? {
      page: "bg-slate-950",
      panel: "bg-slate-900",
      panel2: "bg-slate-800",
      border: "border-slate-800",
      text: "text-slate-100",
      muted: "text-slate-400",
      bubbleMe: "bg-primary text-slate-950",
      bubbleOther: "bg-slate-800 text-slate-100",
      hover: "hover:bg-slate-800/60",
    }
  : {
      page: "bg-slate-50",
      panel: "bg-white",
      panel2: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-900",
      muted: "text-gray-600",
      bubbleMe: "bg-primary text-slate-950",
      bubbleOther: "bg-white text-gray-900 border border-gray-200",
      hover: "hover:bg-gray-100",
    };
