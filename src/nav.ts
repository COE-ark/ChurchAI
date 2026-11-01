export interface NavItem { id: string; label: string; milestone?: number; blurb?: string }
export interface NavGroup { title: string; items: NavItem[] }

export const NAV: NavGroup[] = [
  { title: "Live", items: [
    { id: "dashboard", label: "Dashboard" },
    { id: "present", label: "Start presentation", milestone: 4, blurb: "Send slides to the audience screen, with a live preview for the operator." },
    { id: "detector", label: "AI Bible detector", milestone: 5, blurb: "Listen to the preacher and suggest the Bible verse being quoted." },
  ]},
  { title: "Library", items: [
    { id: "bible", label: "Bible library", milestone: 2, blurb: "Browse, search and project scripture from installed translations." },
    { id: "songs", label: "Worship songs", milestone: 3, blurb: "Keep your songs, format lyrics into slides and search during a service." },
    { id: "media", label: "Media library", milestone: 9, blurb: "Organise images, background videos, logos and audio." },
  ]},
  { title: "Create", items: [
    { id: "editor", label: "Presentation editor", milestone: 4, blurb: "Build slides with text, verses, lyrics, images and themes." },
    { id: "themes", label: "Themes and backgrounds", milestone: 4, blurb: "Design and save looks for your projected slides." },
    { id: "services", label: "Service planner", milestone: 9, blurb: "Arrange the order of service and launch each item live." },
    { id: "sermon", label: "AI sermon assistant", milestone: 6, blurb: "Transcribe sermons and produce summaries, points and reports." },
  ]},
  { title: "Output", items: [
    { id: "displays", label: "Display and output", milestone: 4, blurb: "Choose which screen or projector the congregation sees." },
    { id: "broadcast", label: "OBS and NDI", milestone: 7, blurb: "Browser-source pages and NDI video for livestreams." },
    { id: "remote", label: "Remote control", milestone: 8, blurb: "Pair Android phones to control slides over your local network." },
  ]},
  { title: "System", items: [
    { id: "settings", label: "Settings" },
  ]},
];
