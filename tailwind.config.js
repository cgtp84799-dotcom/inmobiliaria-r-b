/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         COLORES — mapeados a variables CSS semánticas
         Uso: bg-surface, text-muted, border-themed, etc.
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
      colors: {
        /* ── Primario (amber/dorado) ── */
        primary: {
          DEFAULT: "#f59e0b",
          50:  "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },

        /* ── Aliases heredados ── */
        dark:  "#020617",
        light: "#e5e7eb",

        /* ── Superficies semánticas → variables CSS ── */
        bg:          "var(--color-bg)",
        surface:     "var(--color-surface)",
        "surface-2": "var(--color-surface-2)",
        "surface-off":"var(--color-surface-off)",

        /* ── Textos semánticos ── */
        "t-base":    "var(--color-text)",
        "t-muted":   "var(--color-text-muted)",
        "t-faint":   "var(--color-text-faint)",
        "t-inverse": "var(--color-text-inverse)",

        /* ── Bordes semánticos ── */
        themed:      "var(--color-border)",
        divider:     "var(--color-divider)",

        /* ── Sidebar ── */
        sidebar: {
          bg:        "var(--color-sidebar-bg)",
          text:      "var(--color-sidebar-text)",
          muted:     "var(--color-sidebar-muted)",
          border:    "var(--color-sidebar-border)",
          hover:     "var(--color-sidebar-hover-bg)",
          active:    "var(--color-sidebar-active-bg)",
        },

        /* ── Footer ── */
        footer: {
          bg:        "var(--color-footer-bg)",
          text:      "var(--color-footer-text)",
          muted:     "var(--color-footer-muted)",
          border:    "var(--color-footer-border)",
        },

        /* ── Navbar ── */
        nav: {
          bg:        "var(--color-nav-bg)",
          text:      "var(--color-nav-text)",
          sub:       "var(--color-nav-text-sub)",
          border:    "var(--color-nav-border)",
        },

        /* ── Inputs ── */
        input: {
          bg:        "var(--color-input-bg)",
          border:    "var(--color-input-border)",
          text:      "var(--color-input-text)",
          focus:     "var(--color-input-focus)",
        },

        /* ── Modales ── */
        modal: {
          bg:        "var(--color-modal-bg)",
          border:    "var(--color-modal-border)",
        },

        /* ── Tablas / filas ── */
        row: {
          hover:     "var(--color-row-hover)",
          stripe:    "var(--color-row-stripe)",
        },
        "inner-card":   "var(--color-inner-card)",
        "inner-border": "var(--color-inner-border)",
      },

      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         SOMBRAS — mapeadas a variables CSS
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
      boxShadow: {
        sm:        "var(--shadow-sm)",
        card:      "var(--shadow-card)",
        lg:        "var(--shadow-lg)",
        "glow-gold": "var(--shadow-glow-gold)",
        /* Sombras extra para propiedades destacadas */
        "card-hover": "0 8px 28px rgba(60,40,10,0.10), 0 2px 6px rgba(60,40,10,0.07)",
        "gold-strong": "0 4px 24px rgba(245,158,11,0.35), 0 1px 4px rgba(0,0,0,0.12)",
      },

      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         BORDES RADIUS — escala consistente
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
      borderRadius: {
        "2xs": "0.25rem",   /*  4px */
        xs:    "0.375rem",  /*  6px */
        sm:    "0.5rem",    /*  8px */
        md:    "0.625rem",  /* 10px */
        lg:    "0.75rem",   /* 12px */
        xl:    "0.875rem",  /* 14px */
        "2xl": "1rem",      /* 16px */
        "3xl": "1.25rem",   /* 20px */
        "4xl": "1.5rem",    /* 24px */
      },

      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         FUENTES
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
      fontFamily: {
        sans:    ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono", "Fira Code", "monospace"],
      },

      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         TIPOGRAFÍA — escala con clamp() fluid
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
      fontSize: {
        "11px": ["0.6875rem", { lineHeight: "1.4" }],
        "2xs":  ["0.6875rem", { lineHeight: "1.4" }],
        xs:     ["0.75rem",   { lineHeight: "1.5" }],
        sm:     ["0.875rem",  { lineHeight: "1.5" }],
        base:   ["1rem",      { lineHeight: "1.6" }],
        lg:     ["1.125rem",  { lineHeight: "1.5" }],
        xl:     ["1.25rem",   { lineHeight: "1.4" }],
        "2xl":  ["1.5rem",    { lineHeight: "1.3" }],
        "3xl":  ["1.875rem",  { lineHeight: "1.2" }],
        "4xl":  ["2.25rem",   { lineHeight: "1.1" }],
      },

      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         ESPACIADO ADICIONAL
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
      spacing: {
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
        "22": "5.5rem",
        "26": "6.5rem",
        "30": "7.5rem",
        "sidebar": "15rem",      /* ancho sidebar expandido */
        "sidebar-collapsed": "4rem", /* ancho sidebar colapsado */
        "topbar": "3.75rem",     /* alto topbar admin */
        "navbar": "4rem",        /* alto navbar público */
      },

      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         TRANSICIONES
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
      transitionTimingFunction: {
        spring:  "cubic-bezier(0.34, 1.56, 0.64, 1)",
        smooth:  "cubic-bezier(0.4, 0, 0.2, 1)",
        out:     "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        150: "150ms",
        250: "250ms",
        350: "350ms",
        400: "400ms",
      },

      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         KEYFRAMES Y ANIMACIONES
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-12px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(12px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(245,158,11,0)" },
          "50%":      { boxShadow: "0 0 0 6px rgba(245,158,11,0.14)" },
        },
        "bounce-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "fade-in":        "fade-in 0.3s cubic-bezier(0.16,1,0.3,1) forwards",
        "fade-up":        "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        "scale-in":       "scale-in 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "slide-in-left":  "slide-in-left 0.3s cubic-bezier(0.16,1,0.3,1) forwards",
        "slide-in-right": "slide-in-right 0.3s cubic-bezier(0.16,1,0.3,1) forwards",
        "spin-slow":      "spin-slow 8s linear infinite",
        "pulse-gold":     "pulse-gold 2.4s ease-in-out infinite",
        "bounce-soft":    "bounce-soft 2s ease-in-out infinite",
        shimmer:          "shimmer 1.6s ease-in-out infinite",
      },

      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         BACKDROP BLUR
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
      backdropBlur: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },

      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         Z-INDEX — escala explícita
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
      zIndex: {
        sidebar:  "40",
        topbar:   "50",
        dropdown: "60",
        modal:    "70",
        toast:    "80",
        tooltip:  "90",
      },

      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         ASPECT RATIOS
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
      aspectRatio: {
        property: "4 / 3",   /* fotos de inmuebles */
        card:     "16 / 9",
        portrait: "3 / 4",
        square:   "1 / 1",
      },
    },
  },
  plugins: [],
};