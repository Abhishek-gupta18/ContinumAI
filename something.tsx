import {
    CSSProperties,
    startTransition,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"
const useIsStaticRenderer = () => false

// User request: fully restore all landing content while keeping named section functions and controls, with responsive/accessibility fixes and premium visual polish.

type MetricItem = { value: string; label: string }
type FeatureItem = { title: string; description: string; metric: string }
type JobItem = {
    title: string
    company: string
    location: string
    experience: string
    score: string
    status: string
    gap: string
}
type CommunityItem = {
    company: string
    role: string
    round: string
    date: string
    topics: string
    confidence: string
    evidence: string
    summary: string
}
type FooterGroup = { title: string; links: { label: string; url: string }[] }
type FontLike = {
    fontSize?: string | number
    fontWeight?: number | string
    fontFamily?: string
    lineHeight?: string | number
    letterSpacing?: string | number
    fontStyle?: string
    textAlign?: "left" | "right" | "center"
}
type ThemeTokens = {
    bg: string
    card: string
    text: string
    subtle: string
    line: string
    accent: string
    glow: string
}
type SharedCtx = {
    theme: ThemeTokens
    typo: {
        heading: CSSProperties
        body: CSSProperties
        meta: CSSProperties
        button: CSSProperties
    }
    sectionWrap: CSSProperties
    reducedMotion: boolean
    staticRenderer: boolean
}

interface MyComponentProps {
    style?: CSSProperties
    heading: string
    description: string
    accent: string
    background: string
    textColor: string
    subtleText: string
    surface: string
    hairline: string
    signupUrl: string
    signinUrl: string
    stats: MetricItem[]
    features: FeatureItem[]
    jobs: JobItem[]
    community: CommunityItem[]
    footerGroups: FooterGroup[]
    headingFont: FontLike
    bodyFont: FontLike
    metaFont: FontLike
    buttonFont: FontLike
}

const navLinks = [
    { label: "Product", id: "hero" },
    { label: "How it Works", id: "how" },
    { label: "Features", id: "features" },
    { label: "Interview Intelligence", id: "interview" },
    { label: "For Candidates", id: "community" },
]

const defaultStats: MetricItem[] = [
    { value: "10K+", label: "Candidate Profiles" },
    { value: "500+", label: "Companies Tracked" },
    { value: "100K+", label: "Skills & Questions" },
    { value: "95%", label: "Profile-to-Role Matching Coverage" },
]
const defaultFeatures: FeatureItem[] = [
    {
        title: "Verified Skills",
        description: "From assessment to evidence-backed capability.",
        metric: "Assessment → Evidence",
    },
    {
        title: "Smart Job Matching",
        description: "Match capabilities, experience, and preferences.",
        metric: "Fit score with context",
    },
    {
        title: "Skill Gap Intelligence",
        description: "Expose missing competencies by target role.",
        metric: "Role gap heatmap",
    },
    {
        title: "Personalized Roadmap",
        description: "Sequence learning and practice by impact.",
        metric: "Priority-guided steps",
    },
    {
        title: "Interview Intelligence",
        description: "Community-reported interview patterns.",
        metric: "Company + round insights",
    },
    {
        title: "Application Tracking",
        description: "Track saved, applied, interview statuses.",
        metric: "Pipeline visibility",
    },
]
const defaultJobs: JobItem[] = [
    {
        title: "Backend Engineer",
        company: "Razorpay",
        location: "Bengaluru",
        experience: "1–3 years",
        score: "91%",
        status: "ELIGIBLE",
        gap: "",
    },
    {
        title: "Software Engineer",
        company: "Postman",
        location: "Bengaluru",
        experience: "0–2 years",
        score: "76%",
        status: "PARTIALLY ELIGIBLE",
        gap: "System Design",
    },
    {
        title: "Full Stack Developer",
        company: "Linear",
        location: "Remote",
        experience: "1–3 years",
        score: "62%",
        status: "SKILL GAP",
        gap: "React + Testing",
    },
]
const defaultCommunity: CommunityItem[] = [
    {
        company: "Amazon",
        role: "SDE Intern",
        round: "Online Assessment",
        date: "Jan 2026",
        topics: "Arrays, hashing, aptitude",
        confidence: "High confidence",
        evidence: "17 reports",
        summary: "2 coding questions + aptitude",
    },
    {
        company: "Microsoft",
        role: "SDE 1",
        round: "Technical Round",
        date: "Dec 2025",
        topics: "Trees, DBMS, projects",
        confidence: "Moderate confidence",
        evidence: "9 reports",
        summary: "Trees + DBMS + project discussion",
    },
    {
        company: "Atlassian",
        role: "Backend Intern",
        round: "Round 2",
        date: "Nov 2025",
        topics: "APIs, SQL, edge cases",
        confidence: "Moderate confidence",
        evidence: "6 reports",
        summary: "API design walkthrough + SQL optimization",
    },
]
const defaultFooter: FooterGroup[] = [
    {
        title: "Product",
        links: [
            { label: "Dashboard", url: "" },
            { label: "Jobs", url: "#jobs" },
            { label: "Tests", url: "" },
            { label: "Preparation", url: "#how" },
            { label: "Interview Intelligence", url: "#interview" },
        ],
    },
    {
        title: "Resources",
        links: [
            { label: "How It Works", url: "#how" },
            { label: "Career Guides", url: "" },
            { label: "Interview Experiences", url: "#community" },
            { label: "Skill Assessments", url: "" },
        ],
    },
    {
        title: "Company",
        links: [
            { label: "About", url: "" },
            { label: "Contact", url: "" },
            { label: "Privacy", url: "" },
            { label: "Terms", url: "" },
        ],
    },
    {
        title: "Community",
        links: [
            { label: "LinkedIn", url: "" },
            { label: "GitHub", url: "" },
            { label: "Discord", url: "" },
        ],
    },
]

function useReducedMotionSafe() {
    const [reduced, setReduced] = useState(false)
    useEffect(() => {
        if (typeof window === "undefined") return
        const media = window.matchMedia("(prefers-reduced-motion: reduce)")
        startTransition(() => setReduced(media.matches))
        const onChange = () => startTransition(() => setReduced(media.matches))
        media.addEventListener("change", onChange)
        return () => media.removeEventListener("change", onChange)
    }, [])
    return reduced
}

function resolveFont(
    font: FontLike | undefined,
    fallback: FontLike
): CSSProperties {
    return {
        fontSize: font?.fontSize ?? fallback.fontSize,
        fontWeight: font?.fontWeight ?? fallback.fontWeight,
        fontFamily: font?.fontFamily ?? fallback.fontFamily,
        lineHeight: font?.lineHeight ?? fallback.lineHeight,
        letterSpacing: font?.letterSpacing ?? fallback.letterSpacing,
        fontStyle: font?.fontStyle ?? fallback.fontStyle,
        textAlign: font?.textAlign ?? fallback.textAlign,
    }
}

function ProgressBar({
    shared,
    label,
    value,
}: {
    shared: SharedCtx
    label: string
    value: number
}) {
    return (
        <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={shared.typo.body}>{label}</span>
                <span
                    style={{ ...shared.typo.meta, color: shared.theme.subtle }}
                >
                    {value}%
                </span>
            </div>
            <div
                style={{
                    height: 7,
                    borderRadius: 99,
                    overflow: "hidden",
                    background: `color-mix(in srgb, ${shared.theme.text} 14%, transparent)`,
                }}
            >
                <div
                    className="pv-progress-fill"
                    style={{
                        width: `${value}%`,
                        height: "100%",
                        background: shared.theme.accent,
                    }}
                />
            </div>
        </div>
    )
}

function Button({
    shared,
    label,
    primary = true,
    onClick,
}: {
    shared: SharedCtx
    label: string
    primary?: boolean
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            style={{
                ...shared.typo.button,
                border: `1px solid ${primary ? shared.theme.accent : shared.theme.line}`,
                background: primary ? shared.theme.accent : "transparent",
                color: primary ? "#0B0D10" : shared.theme.text,
                borderRadius: 8,
                padding: "12px 16px",
                cursor: "pointer",
                clipPath: primary
                    ? "polygon(0 0,100% 0,100% 82%,96% 100%,0 100%)"
                    : "none",
            }}
        >
            {label}
        </button>
    )
}

function Badge({ shared, label }: { shared: SharedCtx; label: string }) {
    return (
        <span
            style={{
                ...shared.typo.meta,
                border: `1px solid ${shared.theme.line}`,
                borderRadius: 999,
                padding: "5px 10px",
                display: "inline-block",
            }}
        >
            {label}
        </span>
    )
}

function Icon({
    kind,
    color,
}: {
    kind: "theme" | "menu" | "close"
    color: string
}) {
    if (kind === "theme")
        return (
            <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
                <path
                    d="M13.4 2.8A7.4 7.4 0 1 0 17.2 14a6.4 6.4 0 0 1-3.8-11.2Z"
                    fill="none"
                    stroke={color}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                />
            </svg>
        )
    if (kind === "close")
        return (
            <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
                <path
                    d="M4 4l12 12M16 4L4 16"
                    fill="none"
                    stroke={color}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                />
            </svg>
        )
    return (
        <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
            <path
                d="M3 5h14M3 10h14M3 15h14"
                fill="none"
                stroke={color}
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    )
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function ProventaLanding(props: MyComponentProps) {
    const {
        style,
        heading,
        description,
        accent,
        background,
        textColor,
        subtleText,
        surface,
        hairline,
        signupUrl,
        signinUrl,
        stats = defaultStats,
        features = defaultFeatures,
        jobs = defaultJobs,
        community = defaultCommunity,
        footerGroups = defaultFooter,
        headingFont,
        bodyFont,
        metaFont,
        buttonFont,
    } = props
    const staticRenderer = useIsStaticRenderer()
    const reducedMotion = useReducedMotionSafe()
    const [isLight, setIsLight] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [dialogText, setDialogText] = useState("")
    const [lastFocus, setLastFocus] = useState<HTMLElement | null>(null)
    const modalRef = useRef<HTMLDivElement | null>(null)
    const menuRef = useRef<HTMLDivElement | null>(null)

    const theme = useMemo<ThemeTokens>(
        () =>
            isLight
                ? {
                      bg: "#F8F6F2",
                      card: "#FFFFFF",
                      text: "#16181B",
                      subtle: "#5E5B55",
                      line: "rgba(22,24,27,0.14)",
                      accent,
                      glow: "rgba(243,146,75,0.18)",
                  }
                : {
                      bg: background,
                      card: surface,
                      text: textColor,
                      subtle: subtleText,
                      line: hairline,
                      accent,
                      glow: "rgba(243,146,75,0.14)",
                  },
        [isLight, accent, background, textColor, subtleText, surface, hairline]
    )
    const sectionWrap = useMemo<CSSProperties>(
        () => ({
            maxWidth: 1240,
            margin: "0 auto",
            padding: "0 24px",
            width: "100%",
            boxSizing: "border-box",
        }),
        []
    )
    const typo = useMemo(
        () => ({
            heading: {
                ...resolveFont(headingFont, {
                    fontSize: "40px",
                    fontWeight: 700,
                    fontFamily: "Inter, sans-serif",
                    lineHeight: "1em",
                    letterSpacing: "-0.04em",
                    textAlign: "left",
                }),
                margin: 0,
            },
            body: {
                ...resolveFont(bodyFont, {
                    fontSize: "15px",
                    fontWeight: 500,
                    fontFamily: "Inter, sans-serif",
                    lineHeight: "1.3em",
                    letterSpacing: "-0.01em",
                    textAlign: "left",
                }),
                margin: 0,
            },
            meta: {
                ...resolveFont(metaFont, {
                    fontSize: "11px",
                    fontWeight: 500,
                    fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, monospace",
                    lineHeight: "1.3em",
                    letterSpacing: "0.08em",
                    textAlign: "left",
                }),
                margin: 0,
                textTransform: "uppercase" as const,
            },
            button: resolveFont(buttonFont, {
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: "Inter, sans-serif",
                lineHeight: "1em",
                letterSpacing: "-0.01em",
                textAlign: "left",
            }),
        }),
        [headingFont, bodyFont, metaFont, buttonFont]
    )
    const shared = useMemo<SharedCtx>(
        () => ({ theme, sectionWrap, typo, reducedMotion, staticRenderer }),
        [theme, sectionWrap, typo, reducedMotion, staticRenderer]
    )

    const scrollToSection = useCallback(
        (id: string) => {
            if (typeof document === "undefined") return
            document
                .getElementById(id)
                ?.scrollIntoView({
                    behavior: reducedMotion ? "auto" : "smooth",
                    block: "start",
                })
        },
        [reducedMotion]
    )
    const openDialog = useCallback((msg: string) => {
        const active =
            typeof document !== "undefined"
                ? (document.activeElement as HTMLElement | null)
                : null
        startTransition(() => {
            setDialogText(msg)
            setLastFocus(active)
        })
    }, [])
    const auth = useCallback(
        (kind: "signup" | "signin") => {
            const href = kind === "signup" ? signupUrl : signinUrl
            if (!href)
                return openDialog(
                    "This is a demo preview. Account creation/sign-in is not connected yet."
                )
            if (typeof window !== "undefined")
                window.open(href, "_blank", "noopener,noreferrer")
        },
        [signupUrl, signinUrl, openDialog]
    )

    useEffect(() => {
        if (!dialogText || typeof document === "undefined") return
        const prev = document.body.style.overflow
        document.body.style.overflow = "hidden"
        const root = modalRef.current
        const list = root?.querySelectorAll<HTMLElement>(
            "button,[href],[tabindex]:not([tabindex='-1'])"
        )
        list?.[0]?.focus()
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") startTransition(() => setDialogText(""))
            if (e.key === "Tab" && list && list.length >= 1) {
                const first = list[0]
                const last = list[list.length - 1]
                if (list.length === 1) {
                    e.preventDefault()
                    first.focus()
                } else if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault()
                    last.focus()
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault()
                    first.focus()
                }
            }
        }
        document.addEventListener("keydown", onKey)
        return () => {
            document.removeEventListener("keydown", onKey)
            document.body.style.overflow = prev
            lastFocus?.focus()
        }
    }, [dialogText, lastFocus])

    useEffect(() => {
        if (typeof document === "undefined") return
        const onEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") startTransition(() => setMenuOpen(false))
        }
        document.addEventListener("keydown", onEsc)
        return () => document.removeEventListener("keydown", onEsc)
    }, [])

    return (
        <main
            className="proventa-root"
            style={{
                position: "relative",
                width: "100%",
                overflowX: "clip",
                minHeight: "100%",
                background: theme.bg,
                color: theme.text,
                paddingTop: 64,
                ...style,
            }}
        >
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');.proventa-root *{box-sizing:border-box}.proventa-root{font-family:Inter,sans-serif}.proventa-root :focus-visible{outline:2px solid ${theme.accent};outline-offset:2px}.proventa-root .skip{position:absolute;left:8px;top:8px;transform:translateY(-160%);background:${theme.card};color:${theme.text};padding:8px;border:1px solid ${theme.line};border-radius:8px}.proventa-root .skip:focus{transform:translateY(0)}.proventa-root .grid2{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,1fr);gap:32px}.proventa-root .features{display:grid;grid-template-columns:repeat(12,1fr);gap:14px}.proventa-root .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.proventa-root .jobs,.proventa-root .community{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.proventa-root .foot{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.proventa-root .menu,.proventa-root .mobileAuth{display:none}.proventa-root .menu{display:none!important}.proventa-root .card{transition:transform .2s ease,border-color .2s ease}.proventa-root .card:hover{transform:translateY(-2px);border-color:${theme.accent}}.proventa-root .pv-progress-fill{transform-origin:left center;animation:pvScale .7s ease both}@keyframes pvScale{from{transform:scaleX(.2)}to{transform:scaleX(1)}}@media(max-width:1100px){.proventa-root .hideNav{display:none!important}.proventa-root .menu{display:inline-flex!important}.proventa-root .features{grid-template-columns:repeat(6,1fr)}}@media(max-width:1000px){.proventa-root .grid2,.proventa-root .jobs,.proventa-root .community{grid-template-columns:1fr}}@media(max-width:700px){.proventa-root .hideMobile{display:none!important}.proventa-root .mobileAuth{display:flex}.proventa-root .features>article{grid-column:1/-1!important}.proventa-root .stats{grid-template-columns:repeat(2,1fr)!important}.proventa-root .foot{grid-template-columns:repeat(2,1fr)!important}}@media(prefers-reduced-motion:reduce){.proventa-root .pv-progress-fill,.proventa-root .card{animation:none!important;transition:none!important}}`}</style>
            <a className="skip" href="#hero">
                Skip to content
            </a>
            <Navbar
                shared={shared}
                isLight={isLight}
                menuOpen={menuOpen}
                setIsLight={setIsLight}
                setMenuOpen={setMenuOpen}
                scrollToSection={scrollToSection}
                auth={auth}
                menuRef={menuRef}
            />
            <Hero
                shared={shared}
                heading={heading}
                description={description}
                auth={auth}
                scrollToSection={scrollToSection}
            />
            <StatsStrip shared={shared} stats={stats} />
            <ProblemSection shared={shared} />
            <HowItWorks shared={shared} />
            <FeatureBento shared={shared} features={features} />
            <InterviewIntelligence
                shared={shared}
                scrollToSection={scrollToSection}
            />
            <RoadmapPreview shared={shared} scrollToSection={scrollToSection} />
            <JobMatching shared={shared} jobs={jobs} />
            <CareerLoop shared={shared} />
            <CommunityInsights shared={shared} community={community} />
            <FinalCTA
                shared={shared}
                auth={auth}
                scrollToSection={scrollToSection}
            />
            <Footer
                shared={shared}
                footerGroups={footerGroups}
                scrollToSection={scrollToSection}
                openDialog={openDialog}
            />
            {!!dialogText && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Demo notice dialog"
                    onClick={() => startTransition(() => setDialogText(""))}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,.45)",
                        display: "grid",
                        placeItems: "center",
                        zIndex: 50,
                    }}
                >
                    <div
                        ref={modalRef}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: "min(460px,92vw)",
                            background: theme.card,
                            border: `1px solid ${theme.line}`,
                            borderRadius: 8,
                            padding: 16,
                        }}
                    >
                        <p style={{ ...typo.heading, fontSize: 24 }}>
                            Demo Preview
                        </p>
                        <p
                            style={{
                                ...typo.body,
                                color: theme.subtle,
                                marginTop: 8,
                            }}
                        >
                            {dialogText}
                        </p>
                        <div style={{ marginTop: 12 }}>
                            <Button
                                shared={shared}
                                label="Close"
                                primary={false}
                                onClick={() =>
                                    startTransition(() => setDialogText(""))
                                }
                            />
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}

function Navbar({
    shared,
    isLight,
    menuOpen,
    setIsLight,
    setMenuOpen,
    scrollToSection,
    auth,
    menuRef,
}: {
    shared: SharedCtx
    isLight: boolean
    menuOpen: boolean
    setIsLight: (v: boolean | ((p: boolean) => boolean)) => void
    setMenuOpen: (v: boolean | ((p: boolean) => boolean)) => void
    scrollToSection: (id: string) => void
    auth: (k: "signup" | "signin") => void
    menuRef: { current: HTMLDivElement | null }
}) {
    return (
        <header
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                borderBottom: `1px solid ${shared.theme.line}`,
                background: `color-mix(in srgb, ${shared.theme.bg} 80%, transparent)`,
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
        >
            <div
                style={{
                    ...shared.sectionWrap,
                    minHeight: 64,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                }}
            >
                <button
                    onClick={() => scrollToSection("hero")}
                    style={{
                        border: 0,
                        background: "transparent",
                        color: shared.theme.text,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                    }}
                >
                    <svg width="22" height="22" viewBox="0 0 25 25">
                        <path
                            d="M3 20.5L8.5 4.5H14.2L10 20.5H3Z"
                            fill={shared.theme.accent}
                        />
                        <path
                            d="M12.5 20.5L17.5 4.5H22L17.2 20.5H12.5Z"
                            fill={shared.theme.text}
                        />
                    </svg>
                    <span
                        style={{
                            ...shared.typo.body,
                            fontFamily: `'Space Grotesk', ${String(shared.typo.body.fontFamily)}`,
                            fontSize: 22,
                            fontWeight: 500,
                        }}
                    >
                        Proventa
                    </span>
                </button>
                <nav className="hideNav">
                    <ul
                        style={{
                            margin: 0,
                            padding: 0,
                            listStyle: "none",
                            display: "flex",
                            gap: 16,
                        }}
                    >
                        {navLinks.map((n) => (
                            <li key={n.id}>
                                <button
                                    onClick={() => scrollToSection(n.id)}
                                    style={{
                                        ...shared.typo.body,
                                        border: 0,
                                        background: "transparent",
                                        color: shared.theme.subtle,
                                        cursor: "pointer",
                                    }}
                                >
                                    {n.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                        aria-label="Toggle theme"
                        onClick={() =>
                            startTransition(() =>
                                setIsLight((p: boolean) => !p)
                            )
                        }
                        style={{
                            width: 36,
                            height: 36,
                            border: `1px solid ${shared.theme.line}`,
                            borderRadius: 8,
                            background: "transparent",
                            display: "grid",
                            placeItems: "center",
                        }}
                    >
                        <Icon kind="theme" color={shared.theme.text} />
                    </button>
                    <div
                        className="hideMobile"
                        style={{ display: "flex", gap: 8 }}
                    >
                        <Button
                            shared={shared}
                            label="Sign In"
                            primary={false}
                            onClick={() => auth("signin")}
                        />
                        <Button
                            shared={shared}
                            label="Get Started"
                            onClick={() => auth("signup")}
                        />
                    </div>
                    <button
                        className="menu"
                        aria-expanded={menuOpen}
                        aria-label="Toggle menu"
                        onClick={() =>
                            startTransition(() =>
                                setMenuOpen((p: boolean) => !p)
                            )
                        }
                        style={{
                            width: 36,
                            height: 36,
                            border: `1px solid ${shared.theme.line}`,
                            borderRadius: 8,
                            background: "transparent",
                            display: "grid",
                            placeItems: "center",
                        }}
                    >
                        {menuOpen ? (
                            <Icon kind="close" color={shared.theme.text} />
                        ) : (
                            <Icon kind="menu" color={shared.theme.text} />
                        )}
                    </button>
                </div>
            </div>
            {menuOpen && (
                <div
                    ref={menuRef}
                    style={{ ...shared.sectionWrap, paddingBottom: 10 }}
                >
                    <div
                        style={{
                            border: `1px solid ${shared.theme.line}`,
                            borderRadius: 8,
                            background: shared.theme.card,
                            padding: 10,
                        }}
                    >
                        {navLinks.map((n) => (
                            <button
                                key={n.id}
                                onClick={() => {
                                    scrollToSection(n.id)
                                    startTransition(() => setMenuOpen(false))
                                }}
                                style={{
                                    ...shared.typo.body,
                                    color: shared.theme.text,
                                    display: "block",
                                    width: "100%",
                                    textAlign: "left",
                                    border: 0,
                                    background: "transparent",
                                    padding: "8px 2px",
                                }}
                            >
                                {n.label}
                            </button>
                        ))}
                        <div
                            className="mobileAuth"
                            style={{ gap: 8, marginTop: 8 }}
                        >
                            <Button
                                shared={shared}
                                label="Sign In"
                                primary={false}
                                onClick={() => auth("signin")}
                            />
                            <Button
                                shared={shared}
                                label="Get Started"
                                onClick={() => auth("signup")}
                            />
                        </div>
                    </div>
                </div>
            )}
        </header>
    )
}

function Hero({
    shared,
    heading,
    description,
    auth,
    scrollToSection,
}: {
    shared: SharedCtx
    heading: string
    description: string
    auth: (k: "signup" | "signin") => void
    scrollToSection: (id: string) => void
}) {
    const highlighted = heading.includes("Where You Stand.")
    return (
        <section
            id="hero"
            style={{
                ...shared.sectionWrap,
                position: "relative",
                paddingTop: 56,
                paddingBottom: 100,
                scrollMarginTop: 80,
            }}
        >
            <svg
                width="100%"
                height="100%"
                style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.06,
                    pointerEvents: "none",
                }}
            >
                <defs>
                    <pattern
                        id="pvhex"
                        width="34"
                        height="29"
                        patternUnits="userSpaceOnUse"
                    >
                        <path
                            d="M17 1l14 8v11l-14 8-14-8V9z"
                            fill="none"
                            stroke={shared.theme.text}
                            strokeWidth="1"
                        />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#pvhex)" />
            </svg>
            <div className="grid2" style={{ position: "relative" }}>
                <div>
                    <p
                        style={{
                            ...shared.typo.meta,
                            color: shared.theme.subtle,
                        }}
                    >
                        CAREER INTELLIGENCE, BUILT AROUND YOU
                    </p>
                    <h1
                        style={{
                            ...shared.typo.heading,
                            fontFamily: `'Space Grotesk', ${String(shared.typo.heading.fontFamily)}`,
                            fontSize: "clamp(36px,5vw,60px)",
                            fontWeight: 700,
                            lineHeight: 1.1,
                            marginTop: 10,
                        }}
                    >
                        {highlighted ? (
                            <>
                                {heading.replace("Where You Stand.", "").trim()}{" "}
                                <span style={{ color: shared.theme.accent }}>
                                    Where You Stand.
                                </span>
                            </>
                        ) : (
                            heading
                        )}
                    </h1>
                    <p
                        style={{
                            ...shared.typo.body,
                            color: shared.theme.subtle,
                            lineHeight: 1.6,
                            marginTop: 14,
                        }}
                    >
                        {description}
                    </p>
                    <div
                        style={{
                            display: "flex",
                            gap: 10,
                            marginTop: 18,
                            flexWrap: "wrap",
                        }}
                    >
                        <Button
                            shared={shared}
                            label="Build My Career Profile"
                            onClick={() => auth("signup")}
                        />
                        <Button
                            shared={shared}
                            label="See How It Works"
                            primary={false}
                            onClick={() => scrollToSection("how")}
                        />
                    </div>
                    <p
                        style={{
                            ...shared.typo.meta,
                            color: shared.theme.subtle,
                            marginTop: 12,
                        }}
                    >
                        No credit card • Free to get started
                    </p>
                </div>
                <aside
                    style={{
                        border: `1px solid ${shared.theme.line}`,
                        borderRadius: 8,
                        background: shared.theme.card,
                        padding: 14,
                        boxShadow: `0 0 38px ${shared.theme.glow}`,
                    }}
                >
                    <p
                        style={{
                            ...shared.typo.meta,
                            color: shared.theme.subtle,
                        }}
                    >
                        Profile completeness 82%
                    </p>
                    <ProgressBar
                        shared={shared}
                        label="JavaScript"
                        value={78}
                    />
                    <ProgressBar shared={shared} label="React" value={71} />
                    <ProgressBar shared={shared} label="DSA" value={64} />
                    <ProgressBar shared={shared} label="SQL" value={82} />
                    <p
                        style={{
                            ...shared.typo.meta,
                            color: shared.theme.accent,
                            marginTop: 10,
                        }}
                    >
                        Target: Backend Developer · Match 78%
                    </p>
                    <ProgressBar
                        shared={shared}
                        label="System Design"
                        value={58}
                    />
                    <ProgressBar shared={shared} label="DSA" value={64} />
                    <ProgressBar shared={shared} label="Docker" value={47} />
                    <div
                        style={{
                            marginTop: 10,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                        }}
                    >
                        <Badge shared={shared} label="verified skill" />
                        <Badge shared={shared} label="3 new matches" />
                        <Badge shared={shared} label="skill gap detected" />
                        <Badge shared={shared} label="interview insight" />
                    </div>
                    <p
                        style={{
                            ...shared.typo.body,
                            color: shared.theme.subtle,
                            marginTop: 8,
                        }}
                    >
                        Complete Docker fundamentals
                    </p>
                    <div style={{ marginTop: 8 }}>
                        <Button
                            shared={shared}
                            label="Continue Roadmap"
                            primary={false}
                            onClick={() => scrollToSection("roadmap")}
                        />
                    </div>
                </aside>
            </div>
        </section>
    )
}

function StatsStrip({
    shared,
    stats,
}: {
    shared: SharedCtx
    stats: MetricItem[]
}) {
    return (
        <section
            style={{
                ...shared.sectionWrap,
                borderTop: `1px solid ${shared.theme.line}`,
                borderBottom: `1px solid ${shared.theme.line}`,
                padding: "24px 24px",
            }}
        >
            <div className="stats">
                {stats.map((s, i) => (
                    <div
                        key={s.label}
                        style={{
                            borderRight:
                                i < stats.length - 1
                                    ? `1px solid ${shared.theme.line}`
                                    : "none",
                            paddingRight: 12,
                        }}
                    >
                        <p
                            style={{
                                ...shared.typo.heading,
                                fontFamily: `'Space Grotesk', ${String(shared.typo.heading.fontFamily)}`,
                                fontSize: 28,
                                color: shared.theme.accent,
                            }}
                        >
                            {s.value}
                        </p>
                        <p
                            style={{
                                ...shared.typo.body,
                                color: shared.theme.subtle,
                            }}
                        >
                            {s.label}
                        </p>
                    </div>
                ))}
            </div>
            <p
                style={{
                    ...shared.typo.meta,
                    color: shared.theme.subtle,
                    marginTop: 8,
                }}
            >
                Illustrative metrics · UI demonstration
            </p>
        </section>
    )
}
function ProblemSection({ shared }: { shared: SharedCtx }) {
    return (
        <section style={{ ...shared.sectionWrap, padding: "100px 24px" }}>
            <h2
                style={{
                    ...shared.typo.heading,
                    fontFamily: `'Space Grotesk', ${String(shared.typo.heading.fontFamily)}`,
                    fontWeight: 700,
                    lineHeight: 1.1,
                    fontSize: "clamp(28px,3.6vw,44px)",
                }}
            >
                Your Resume Tells What You Claim. Your Preparation Should Tell
                What You Can Prove.
            </h2>
            <div className="jobs" style={{ marginTop: 18 }}>
                {[
                    [
                        "01",
                        "Claimed skills ≠ verified skills",
                        "“I know JavaScript” doesn’t tell an employer your proficiency.",
                    ],
                    [
                        "02",
                        "Job descriptions ≠ personalized guidance",
                        "Requirements don’t identify your gaps.",
                    ],
                    [
                        "03",
                        "Interview information is scattered",
                        "No unified intelligence for preparation.",
                    ],
                ].map((p) => (
                    <article
                        key={p[0]}
                        className="card"
                        style={{
                            border: `1px solid ${shared.theme.line}`,
                            borderRadius: 8,
                            background: shared.theme.card,
                            padding: 14,
                        }}
                    >
                        <p
                            style={{
                                ...shared.typo.meta,
                                color: shared.theme.accent,
                            }}
                        >
                            {p[0]}
                        </p>
                        <p
                            style={{
                                ...shared.typo.heading,
                                fontFamily: `'Space Grotesk', ${String(shared.typo.heading.fontFamily)}`,
                                fontSize: 20,
                                marginTop: 8,
                            }}
                        >
                            {p[1]}
                        </p>
                        <p
                            style={{
                                ...shared.typo.body,
                                color: shared.theme.subtle,
                                lineHeight: 1.6,
                                marginTop: 6,
                            }}
                        >
                            {p[2]}
                        </p>
                    </article>
                ))}
            </div>
        </section>
    )
}
function HowItWorks({ shared }: { shared: SharedCtx }) {
    const steps = [
        [
            "Build Your Profile",
            "education, experience, projects, skills, certs, goals",
        ],
        ["Prove Your Skills", "assess evidence proficiency"],
        ["Find Your Gaps", "compare profile against roles"],
        ["Prepare Intelligently", "roadmap resources, assignments, practice"],
        ["Move With Confidence", "apply and track outcomes"],
    ]
    return (
        <section
            id="how"
            style={{
                ...shared.sectionWrap,
                paddingBottom: 100,
                scrollMarginTop: 80,
            }}
        >
            <h2
                style={{
                    ...shared.typo.heading,
                    fontFamily: `'Space Grotesk', ${String(shared.typo.heading.fontFamily)}`,
                    fontSize: "clamp(28px,3.6vw,44px)",
                }}
            >
                From Where You Are To Where You Want To Be.
            </h2>
            <div style={{ position: "relative", marginTop: 16 }}>
                <div
                    style={{
                        position: "absolute",
                        left: 9,
                        top: 8,
                        bottom: 8,
                        width: 1,
                        background: shared.theme.line,
                    }}
                />
                {steps.map((s, i) => (
                    <div
                        key={s[0]}
                        style={{
                            position: "relative",
                            paddingLeft: 34,
                            marginBottom: i === steps.length - 1 ? 0 : 14,
                        }}
                    >
                        <span
                            style={{
                                width: 18,
                                height: 18,
                                borderRadius: 999,
                                border: `1px solid ${shared.theme.accent}`,
                                position: "absolute",
                                left: 0,
                                top: 2,
                            }}
                        />
                        <p
                            style={{
                                ...shared.typo.meta,
                                color: shared.theme.accent,
                            }}
                        >
                            Step {i + 1}
                        </p>
                        <p
                            style={{
                                ...shared.typo.heading,
                                fontSize: 20,
                                marginTop: 4,
                            }}
                        >
                            {s[0]}
                        </p>
                        <p
                            style={{
                                ...shared.typo.body,
                                color: shared.theme.subtle,
                            }}
                        >
                            {s[1]}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    )
}
function FeatureBento({
    shared,
    features,
}: {
    shared: SharedCtx
    features: FeatureItem[]
}) {
    const iconPaths = [
        "M3 10l4 4 10-10",
        "M3 10h14",
        "M4 15h12M4 10h8",
        "M3 4h14M3 10h10",
        "M4 14V6l6-3 6 3v8l-6 3-6-3",
        "M3 5h14v3H3z",
    ];
    const signalValues = [84, 78, 52];
    const badgeLabels = ["step 2/5", "17 reports", "saved 9 • interview 2"];
    return (
        <section
            id="features"
            style={{
                ...shared.sectionWrap,
                paddingBottom: 100,
                scrollMarginTop: 80,
            }}
        >
            <p style={{ ...shared.typo.meta, color: shared.theme.subtle }}>
                Feature overview
            </p>
            <h2
                style={{
                    ...shared.typo.heading,
                    fontFamily: `'Space Grotesk', ${String(shared.typo.heading.fontFamily)}`,
                    fontSize: "clamp(28px,3.6vw,44px)",
                }}
            >
                One Platform. Your Entire Career Journey.
            </h2>
            <div className="features" style={{ marginTop: 16 }}>
                {features.slice(0, 6).map((f, i) => (
                    <article
                        key={f.title}
                        className="card"
                        style={{
                            gridColumn: i < 2 ? "span 6" : "span 3",
                            border: `1px solid ${shared.theme.line}`,
                            borderRadius: 8,
                            background: shared.theme.card,
                            padding: 14,
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 20 20">
                            <path
                                d={iconPaths[i]}
                                fill="none"
                                stroke={shared.theme.accent}
                                strokeWidth="1.7"
                                strokeLinecap="round"
                            />
                        </svg>
                        <p
                            style={{
                                ...shared.typo.heading,
                                fontFamily: `'Space Grotesk', ${String(shared.typo.heading.fontFamily)}`,
                                fontSize: 20,
                                marginTop: 8,
                            }}
                        >
                            {f.title}
                        </p>
                        <p
                            style={{
                                ...shared.typo.body,
                                color: shared.theme.subtle,
                                lineHeight: 1.6,
                            }}
                        >
                            {f.description}
                        </p>
                        <p
                            style={{
                                ...shared.typo.meta,
                                color: shared.theme.accent,
                            }}
                        >
                            {f.metric}
                        </p>
                        <div style={{ marginTop: 8 }}>
                            {i < 3 ? (
                                <ProgressBar
                                    shared={shared}
                                    label="Signal"
                                    value={signalValues[i]}
                                />
                            ) : (
                                <Badge
                                    shared={shared}
                                    label={badgeLabels[i - 3]}
                                />
                            )}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    )
}
function InterviewIntelligence({
    shared,
    scrollToSection,
}: {
    shared: SharedCtx
    scrollToSection: (id: string) => void
}) {
    return (
        <section
            id="interview"
            style={{
                ...shared.sectionWrap,
                paddingBottom: 100,
                scrollMarginTop: 80,
            }}
        >
            <div
                className="grid2"
                style={{
                    border: `1px solid ${shared.theme.accent}`,
                    borderRadius: 8,
                    background: shared.theme.card,
                    padding: 14,
                }}
            >
                <div>
                    <h2
                        style={{
                            ...shared.typo.heading,
                            fontFamily: `'Space Grotesk', ${String(shared.typo.heading.fontFamily)}`,
                            fontSize: "clamp(28px,3.6vw,40px)",
                        }}
                    >
                        Companies Don’t Publish Every Interview Question.
                        Candidates Do.
                    </h2>
                    <p
                        style={{
                            ...shared.typo.body,
                            color: shared.theme.subtle,
                            marginTop: 10,
                        }}
                    >
                        Proventa aggregates publicly shared candidate
                        experiences and community submissions to surface
                        reported interview patterns by company, role and round.
                    </p>
                    <p
                        style={{
                            ...shared.typo.meta,
                            color: shared.theme.subtle,
                            marginTop: 8,
                        }}
                    >
                        Illustrative interview example
                    </p>
                    <p
                        style={{
                            ...shared.typo.body,
                            color: shared.theme.subtle,
                            marginTop: 6,
                        }}
                    >
                        Amazon SDE Intern 2026 online assessment reported by 17
                        candidates.
                    </p>
                    <p
                        style={{
                            ...shared.typo.meta,
                            color: shared.theme.subtle,
                            marginTop: 8,
                        }}
                    >
                        High confidence based on candidate reports · NOT
                        official questions
                    </p>
                    <div style={{ marginTop: 12 }}>
                        <Button
                            shared={shared}
                            label="Explore Interview Intelligence"
                            onClick={() => scrollToSection("community")}
                        />
                    </div>
                </div>
                <div>
                    <ProgressBar
                        shared={shared}
                        label="Arrays & Hashing"
                        value={86}
                    />
                    <ProgressBar
                        shared={shared}
                        label="Dynamic Programming"
                        value={56}
                    />
                    <ProgressBar shared={shared} label="Graphs" value={48} />
                    <ProgressBar shared={shared} label="Trees" value={43} />
                </div>
            </div>
        </section>
    )
}
function RoadmapPreview({
    shared,
    scrollToSection,
}: {
    shared: SharedCtx
    scrollToSection: (id: string) => void
}) {
    const steps = [
        ["01", "SQL Optimization", "done"],
        ["02", "REST API Design", "done"],
        ["03", "Authentication", "done"],
        ["04", "Docker Fundamentals", "current"],
        ["05", "System Design", "pending"],
        ["06", "Mock Interview", "pending"],
    ] as const
    return (
        <section
            id="roadmap"
            style={{
                ...shared.sectionWrap,
                paddingBottom: 100,
                scrollMarginTop: 80,
            }}
        >
            <h2
                style={{
                    ...shared.typo.heading,
                    fontFamily: `'Space Grotesk', ${String(shared.typo.heading.fontFamily)}`,
                    fontSize: "clamp(28px,3.6vw,44px)",
                }}
            >
                Your Career Shouldn’t Come With A Generic Study Plan.
            </h2>
            <p
                style={{
                    ...shared.typo.meta,
                    color: shared.theme.accent,
                    marginTop: 8,
                }}
            >
                Backend Developer readiness 68%
            </p>
            <div className="grid2" style={{ marginTop: 14 }}>
                <div>
                    {steps.map((s) => (
                        <div
                            key={s[0]}
                            style={{
                                border: `1px solid ${s[2] === "current" ? shared.theme.accent : shared.theme.line}`,
                                borderRadius: 8,
                                padding: "10px 12px",
                                marginBottom: 8,
                                background:
                                    s[2] === "current"
                                        ? `color-mix(in srgb, ${shared.theme.accent} 8%, transparent)`
                                        : "transparent",
                            }}
                        >
                            <span
                                style={{
                                    ...shared.typo.meta,
                                    color:
                                        s[2] === "pending"
                                            ? shared.theme.subtle
                                            : shared.theme.accent,
                                }}
                            >
                                {s[0]} · {s[1]}{" "}
                                {s[2] === "current"
                                    ? "CURRENT"
                                    : s[2] === "done"
                                      ? "✓"
                                      : "○"}
                            </span>
                        </div>
                    ))}
                </div>
                <div>
                    <p
                        style={{
                            ...shared.typo.meta,
                            color: shared.theme.subtle,
                        }}
                    >
                        Feedback chain
                    </p>
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                            marginTop: 8,
                        }}
                    >
                        {[
                            "Skill Gap",
                            "Learning Resource",
                            "Practice",
                            "Assessment",
                            "Verified Improvement",
                        ].map((x) => (
                            <Badge key={x} shared={shared} label={x} />
                        ))}
                    </div>
                    <div style={{ marginTop: 10 }}>
                        <Button
                            shared={shared}
                            label="Continue Roadmap"
                            primary={false}
                            onClick={() => scrollToSection("jobs")}
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}
function JobMatching({ shared, jobs }: { shared: SharedCtx; jobs: JobItem[] }) {
    return (
        <section
            id="jobs"
            style={{
                ...shared.sectionWrap,
                paddingBottom: 100,
                scrollMarginTop: 80,
            }}
        >
            <h2
                style={{
                    ...shared.typo.heading,
                    fontFamily: `'Space Grotesk', ${String(shared.typo.heading.fontFamily)}`,
                    fontSize: "clamp(28px,3.6vw,44px)",
                }}
            >
                Don’t Just Find Jobs. Find Jobs You’re Ready For.
            </h2>
            <div className="jobs" style={{ marginTop: 12 }}>
                {jobs.map((j) => (
                    <article
                        key={j.title}
                        className="card"
                        style={{
                            border: `1px solid ${shared.theme.line}`,
                            borderRadius: 8,
                            background: shared.theme.card,
                            padding: 14,
                        }}
                    >
                        <p
                            style={{
                                ...shared.typo.heading,
                                fontFamily: `'Space Grotesk', ${String(shared.typo.heading.fontFamily)}`,
                                fontSize: 20,
                            }}
                        >
                            {j.title}
                        </p>
                        <p
                            style={{
                                ...shared.typo.body,
                                color: shared.theme.subtle,
                            }}
                        >
                            {j.company} · {j.location} · {j.experience}
                        </p>
                        <p
                            style={{
                                ...shared.typo.meta,
                                color: shared.theme.accent,
                            }}
                        >
                            {j.score} · {j.status}
                        </p>
                        {j.gap ? (
                            <p
                                style={{
                                    ...shared.typo.body,
                                    color: shared.theme.subtle,
                                }}
                            >
                                Gap: {j.gap}
                            </p>
                        ) : null}
                    </article>
                ))}
            </div>
            <p
                style={{
                    ...shared.typo.meta,
                    color: shared.theme.subtle,
                    marginTop: 8,
                }}
            >
                Illustrative listings not live openings · capability-based
                score.
            </p>
        </section>
    )
}
function CareerLoop({ shared }: { shared: SharedCtx }) {
    const labels = [
        "ASSESS",
        "VERIFY",
        "MATCH",
        "IDENTIFY GAP",
        "LEARN",
        "PRACTICE",
        "REASSESS",
        "APPLY",
    ]
    return (
        <section style={{ ...shared.sectionWrap, paddingBottom: 100 }}>
            <div className="grid2">
                <div>
                    <h2
                        style={{
                            ...shared.typo.heading,
                            fontFamily: `'Space Grotesk', ${String(shared.typo.heading.fontFamily)}`,
                            fontSize: "clamp(28px,3.6vw,40px)",
                        }}
                    >
                        Career Intelligence Loop
                    </h2>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                    <svg
                        viewBox="0 0 460 460"
                        width="100%"
                        style={{ maxWidth: 360 }}
                    >
                        <defs>
                            <marker
                                id="a"
                                markerWidth="8"
                                markerHeight="8"
                                refX="6"
                                refY="3.5"
                                orient="auto"
                            >
                                <path
                                    d="M0,0 L7,3.5 L0,7 z"
                                    fill={shared.theme.accent}
                                />
                            </marker>
                        </defs>
                        <circle
                            cx="230"
                            cy="230"
                            r="150"
                            fill="none"
                            stroke={shared.theme.line}
                        />
                        <path
                            d="M230 80 A150 150 0 1 1 229.9 80"
                            fill="none"
                            stroke={shared.theme.accent}
                            markerEnd="url(#a)"
                        />
                        {labels.map((l, i) => {
                            const a =
                                (Math.PI * 2 * i) / labels.length - Math.PI / 2
                            const x = 230 + Math.cos(a) * 182
                            const y = 230 + Math.sin(a) * 182
                            return (
                                <text
                                    key={l}
                                    x={x}
                                    y={y}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fill={shared.theme.text}
                                    fontSize="10"
                                >
                                    {l}
                                </text>
                            )
                        })}
                        <text
                            x="230"
                            y="220"
                            textAnchor="middle"
                            fill={shared.theme.text}
                        >
                            Career Intelligence
                        </text>
                        <text
                            x="230"
                            y="242"
                            textAnchor="middle"
                            fill={shared.theme.text}
                        >
                            Loop
                        </text>
                    </svg>
                </div>
            </div>
        </section>
    )
}
function CommunityInsights({
    shared,
    community,
}: {
    shared: SharedCtx
    community: CommunityItem[]
}) {
    return (
        <section
            id="community"
            style={{
                ...shared.sectionWrap,
                paddingBottom: 100,
                scrollMarginTop: 80,
            }}
        >
            <h2
                style={{
                    ...shared.typo.heading,
                    fontFamily: `'Space Grotesk', ${String(shared.typo.heading.fontFamily)}`,
                    fontSize: "clamp(28px,3.6vw,44px)",
                }}
            >
                Learn From People Who’ve Already Been There.
            </h2>
            <div className="community" style={{ marginTop: 12 }}>
                {community.map((c) => (
                    <article
                        key={`${c.company}-${c.role}`}
                        className="card"
                        style={{
                            border: `1px solid ${shared.theme.line}`,
                            borderRadius: 8,
                            background: shared.theme.card,
                            padding: 14,
                        }}
                    >
                        <p
                            style={{
                                ...shared.typo.heading,
                                fontFamily: `'Space Grotesk', ${String(shared.typo.heading.fontFamily)}`,
                                fontSize: 20,
                            }}
                        >
                            {c.company} · {c.role}
                        </p>
                        <p
                            style={{
                                ...shared.typo.body,
                                color: shared.theme.subtle,
                            }}
                        >
                            {c.round} · {c.date}
                        </p>
                        <p style={{ ...shared.typo.body, marginTop: 6 }}>
                            “{c.summary}”
                        </p>
                        <p
                            style={{
                                ...shared.typo.meta,
                                color: shared.theme.subtle,
                                marginTop: 6,
                            }}
                        >
                            Topics: {c.topics}
                        </p>
                        <p
                            style={{
                                ...shared.typo.meta,
                                color: shared.theme.accent,
                            }}
                        >
                            {c.confidence} · {c.evidence}
                        </p>
                        <p
                            style={{
                                ...shared.typo.meta,
                                color: shared.theme.subtle,
                                marginTop: 6,
                            }}
                        >
                            Demo examples only · no personal information
                        </p>
                    </article>
                ))}
            </div>
        </section>
    )
}
function FinalCTA({
    shared,
    auth,
    scrollToSection,
}: {
    shared: SharedCtx
    auth: (k: "signup" | "signin") => void
    scrollToSection: (id: string) => void
}) {
    return (
        <section style={{ ...shared.sectionWrap, paddingBottom: 100 }}>
            <div
                style={{
                    border: `1px solid ${shared.theme.line}`,
                    borderRadius: 8,
                    background: "#F4EBDD",
                    color: "#171819",
                    padding: 28,
                    textAlign: "center",
                    clipPath: "polygon(0 0,100% 0,100% 84%,96% 100%,0 100%)",
                }}
            >
                <h2
                    style={{
                        ...shared.typo.heading,
                        fontFamily: `'Space Grotesk', ${String(shared.typo.heading.fontFamily)}`,
                        fontSize: "clamp(32px,4.2vw,46px)",
                        color: "#171819",
                    }}
                >
                    Know Your Skills.
                    <br />
                    Know Your Gaps.
                    <br />
                    Know Your Next Move.
                </h2>
                <p
                    style={{
                        ...shared.typo.body,
                        color: "#3f3a33",
                        marginTop: 10,
                    }}
                >
                    Build your profile, verify your skills and start preparing
                    for the roles you actually want.
                </p>
                <div
                    style={{
                        marginTop: 14,
                        display: "flex",
                        justifyContent: "center",
                        gap: 10,
                        flexWrap: "wrap",
                    }}
                >
                    <Button
                        shared={shared}
                        label="Get Started Free"
                        onClick={() => auth("signup")}
                    />
                    <button
                        onClick={() => scrollToSection("features")}
                        style={{
                            ...shared.typo.button,
                            border: "1px solid #171819",
                            background: "transparent",
                            color: "#171819",
                            borderRadius: 8,
                            padding: "12px 16px",
                            cursor: "pointer",
                        }}
                    >
                        Explore the Platform
                    </button>
                </div>
            </div>
        </section>
    )
}
function Footer({
    shared,
    footerGroups,
    scrollToSection,
    openDialog,
}: {
    shared: SharedCtx
    footerGroups: FooterGroup[]
    scrollToSection: (id: string) => void
    openDialog: (m: string) => void
}) {
    return (
        <footer
            style={{
                ...shared.sectionWrap,
                borderTop: `1px solid ${shared.theme.line}`,
                paddingTop: 24,
                paddingBottom: 30,
            }}
        >
            <div className="foot">
                {footerGroups.map((g) => {
                    const backup =
                        defaultFooter.find((d) => d.title === g.title)?.links ||
                        []
                    const onlyDashboard =
                        g.links?.length === 1 &&
                        g.links[0]?.label === "Dashboard" &&
                        !g.links[0]?.url
                    const links =
                        !g.links || g.links.length === 0 || onlyDashboard
                            ? backup
                            : g.links
                    return (
                        <div key={g.title}>
                            <p
                                style={{
                                    ...shared.typo.meta,
                                    color: shared.theme.subtle,
                                }}
                            >
                                {g.title}
                            </p>
                            <ul
                                style={{
                                    listStyle: "none",
                                    margin: "8px 0 0",
                                    padding: 0,
                                }}
                            >
                                {links.map((l) => (
                                    <li key={l.label}>
                                        <button
                                            onClick={() => {
                                                const url = l.url || ""
                                                if (url.startsWith("#"))
                                                    scrollToSection(
                                                        url.replace("#", "")
                                                    )
                                                else if (url) {
                                                    if (
                                                        typeof window !==
                                                        "undefined"
                                                    )
                                                        window.open(
                                                            url,
                                                            "_blank",
                                                            "noopener,noreferrer"
                                                        )
                                                } else
                                                    openDialog(
                                                        `${l.label} is coming soon in this demo.`
                                                    )
                                            }}
                                            style={{
                                                ...shared.typo.body,
                                                border: 0,
                                                background: "transparent",
                                                padding: "4px 0",
                                                color: l.url
                                                    ? shared.theme.text
                                                    : shared.theme.subtle,
                                                textAlign: "left",
                                                cursor: "pointer",
                                            }}
                                        >
                                            {l.label}
                                            {!l.url ? " · Coming soon" : ""}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )
                })}
            </div>
            <p
                style={{
                    ...shared.typo.body,
                    color: shared.theme.subtle,
                    marginTop: 20,
                }}
            >
                ©2026 Proventa · Built for people who want to know where they
                stand.
            </p>
        </footer>
)
}
