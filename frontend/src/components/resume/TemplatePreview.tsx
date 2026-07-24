import { Printer, Mail, Phone, Github, Linkedin, Globe, ExternalLink } from 'lucide-react'
import type { Resume } from '../../types'

// ── Data model ───────────────────────────────────────────────────────────────
interface ContactItem { type: 'email'|'phone'|'github'|'linkedin'|'web'|'text'; value: string; url?: string }
interface EduEntry    { institution: string; degree: string; score: string; year: string }
interface ExpEntry    { org: string; location: string; role: string; dates: string; bullets: string[] }
interface Project     { name: string; tech: string; links: LinkItem[]; desc: string[] }
interface LinkItem    { label: string; url?: string }
interface SkillRow    { category: string; value: string }
interface ResumeData  {
  name: string
  contacts: ContactItem[]
  education: EduEntry[]
  experience: ExpEntry[]
  projects: Project[]
  skills: SkillRow[]
  achievements: string[]
  objective: string
}

// ── Parser ───────────────────────────────────────────────────────────────────
function parseResume(raw: string): ResumeData {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const data: ResumeData = { name:'', contacts:[], education:[], experience:[], projects:[], skills:[], achievements:[], objective:'' }

  const SECTION_NAMES = /^(education|experience|projects?|technical skills?|skills?|achievements?|certifications?|summary|objective|contact)/i
  const isSection = (l: string) => SECTION_NAMES.test(l) && l.length < 60

  // ── Header lines (before first section heading)
  let i = 0
  while (i < lines.length && !isSection(lines[i])) {
    const line = lines[i]
    // Split by separator chars: §, #, ï, \x83, \x80, |  (but NOT | inside project lines checked later)
    const parts = line.split(/[§#ï\x83\x80]+/).map(p => p.trim()).filter(Boolean)
    parts.forEach(p => {
      if (!data.name && !/[@+\d]/.test(p) && !/roll|b\.?\s*tech|computer|institute|profile/i.test(p)) {
        data.name = p
      } else {
        data.contacts.push(classifyContact(p))
      }
    })
    i++
  }

  // ── Sections
  let section = ''
  while (i < lines.length) {
    const line = lines[i]
    if (isSection(line)) {
      const low = line.toLowerCase()
      if      (low.includes('edu'))                               section = 'education'
      else if (low.includes('exp') || low.includes('work'))       section = 'experience'
      else if (low.includes('proj'))                              section = 'projects'
      else if (low.includes('skill') || low.includes('technical'))section = 'skills'
      else if (low.includes('achiev') || low.includes('award'))   section = 'achievements'
      else if (low.includes('summary') || low.includes('obj'))    section = 'objective'
      i++; continue
    }

    // ── EDUCATION
    if (section === 'education') {
      if (line.startsWith('•')) {
        const text = line.replace(/^•\s*/, '')
        const yearMatch = text.match(/\s(\d{4}(?:\s*[-–]\s*\d{2,4})?)$/)
        const institution = yearMatch ? text.slice(0, text.lastIndexOf(yearMatch[1])).trim() : text
        const year = yearMatch ? yearMatch[1] : ''
        const entry: EduEntry = { institution, degree:'', score:'', year }
        i++
        while (i < lines.length && !lines[i].startsWith('•') && !isSection(lines[i])) {
          const l = lines[i]
          const sm = l.match(/(CGPA|GPA|Percentage)[:\s]+([\d.]+)/i)
          if (sm) {
            entry.score = `${sm[1]}: ${sm[2]}`
            entry.degree = l.replace(sm[0], '').replace(/,\s*$/, '').trim()
          } else {
            entry.degree = (entry.degree ? entry.degree + ' ' : '') + l
          }
          i++
        }
        data.education.push(entry)
        continue
      }
      i++; continue
    }

    // ── EXPERIENCE
    if (section === 'experience') {
      if (line.startsWith('•')) {
        const text = line.replace(/^•\s*/, '')
        // "SAP Labs India Bengaluru, India" — last 2+ words after 2+ spaces = location
        const locSplit = text.match(/^(.+?)\s{2,}(.+)$/)
        const entry: ExpEntry = {
          org: locSplit ? locSplit[1].trim() : text,
          location: locSplit ? locSplit[2].trim() : '',
          role:'', dates:'', bullets:[]
        }
        i++
        while (i < lines.length && !lines[i].startsWith('•') && !isSection(lines[i])) {
          const l = lines[i]
          const isBullet = /^[–\-]/.test(l)
          const dateMatch = l.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i)
          if (dateMatch && !entry.role) {
            const beforeDate = l.slice(0, l.search(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i)).trim().replace(/,\s*$/, '')
            entry.role = beforeDate
            entry.dates = l.slice(l.search(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i)).trim()
          } else if (isBullet) {
            // New bullet point — strip leading dash/en-dash
            entry.bullets.push(l.replace(/^[–\-]\s*/, ''))
          } else if (entry.bullets.length > 0) {
            // Continuation of previous bullet — join with space
            entry.bullets[entry.bullets.length - 1] += ' ' + l
          } else {
            entry.bullets.push(l)
          }
          i++
        }
        data.experience.push(entry)
        continue
      }
      i++; continue
    }

    // ── PROJECTS
    if (section === 'projects') {
      // Project header: "Name | Tech Stack" (non-bullet, contains |)
      if (!line.startsWith('•') && !line.startsWith('§') && !line.startsWith('\x80') && line.includes('|')) {
        const pipeIdx = line.indexOf('|')
        const proj: Project = { name: line.slice(0, pipeIdx).trim(), tech: line.slice(pipeIdx+1).trim(), links:[], desc:[] }
        i++
        while (i < lines.length && !isSection(lines[i])) {
          const l = lines[i]
          // New project = non-bullet non-link line with |
          if (!l.startsWith('•') && !l.startsWith('§') && !l.startsWith('\x80') && l.includes('|') && l.length < 120) break
          if (l.startsWith('§') || l.startsWith('\x80') || /^(github|live\s*demo|demo)/i.test(l)) {
            // Parse link items from line e.g. "§ GitHub \x80 Live Demo"
            const tokens = l.split(/[§\x80]+/).map(t => t.trim()).filter(Boolean)
            tokens.forEach(t => proj.links.push(classifyLink(t)))
          } else if (/^[–\-]/.test(l)) {
            // New bullet starting with dash/en-dash
            proj.desc.push(l.replace(/^[–\-]\s*/, ''))
          } else if (l.startsWith('•')) {
            proj.desc.push(l.replace(/^•\s*/, ''))
          } else if (proj.desc.length > 0) {
            // Continuation line — join to previous
            proj.desc[proj.desc.length - 1] += ' ' + l
          } else {
            proj.desc.push(l)
          }
          i++
        }
        data.projects.push(proj)
        continue
      }
      i++; continue
    }

    // ── SKILLS
    if (section === 'skills') {
      const colonIdx = line.indexOf(':')
      if (colonIdx > 0 && colonIdx < 45) {
        const cat = line.slice(0, colonIdx).trim()
        const val = line.slice(colonIdx+1).trim()
        // Check if previous skill row has same category (continuation line)
        const prev = data.skills[data.skills.length - 1]
        if (prev && !val && !cat) {
          // pure continuation (no colon), append to last
          prev.value += ' ' + line
        } else if (prev && !prev.value.endsWith(',') === false || true) {
          data.skills.push({ category: cat, value: val })
        }
      } else if (data.skills.length > 0 && !line.includes(':')) {
        // Continuation of previous skill value (e.g. "ExpressJS, MongoDB")
        data.skills[data.skills.length - 1].value += ' ' + line
      }
      i++; continue
    }

    // ── ACHIEVEMENTS
    if (section === 'achievements') {
      if (line.startsWith('•')) {
        data.achievements.push(line.replace(/^•\s*/, ''))
      } else if (data.achievements.length > 0) {
        // Continuation of previous achievement
        data.achievements[data.achievements.length - 1] += ' ' + line
      }
      i++; continue
    }

    if (section === 'objective') {
      data.objective += (data.objective ? ' ' : '') + line
      i++; continue
    }

    i++
  }

  return data
}

function classifyContact(raw: string): ContactItem {
  const t = raw.trim()
  if (/^https?:\/\//i.test(t))          return { type:'web',      value: t, url: t }
  if (/github\.com\//i.test(t))          return { type:'github',   value: t, url: t.startsWith('http') ? t : `https://${t}` }
  if (/linkedin\.com\//i.test(t))        return { type:'linkedin', value: t, url: t.startsWith('http') ? t : `https://${t}` }
  if (/github\s*profile/i.test(t))       return { type:'github',   value: 'GitHub Profile' }
  if (/linkedin\s*profile/i.test(t))     return { type:'linkedin', value: 'LinkedIn Profile' }
  if (t.includes('@') && t.includes('.'))return { type:'email',    value: t, url: `mailto:${t}` }
  if (/roll\s*no/i.test(t))             return { type:'text',     value: t }
  if (/b\.?\s*tech|computer|institute/i.test(t)) return { type:'text', value: t }
  if (/\+?\d[\d\s\-()]{6,}/.test(t))    return { type:'phone',    value: t.match(/\+?[\d\s\-()]+/)?.[0]?.trim() || t }
  return { type:'text', value: t }
}

function classifyLink(t: string): LinkItem {
  if (/^https?:\/\//i.test(t))           return { label: /github/i.test(t) ? 'GitHub' : /demo|render|vercel/i.test(t) ? 'Live Demo' : t, url: t }
  if (/github/i.test(t))                 return { label: 'GitHub' }
  if (/live\s*demo|demo/i.test(t))       return { label: 'Live Demo' }
  return { label: t }
}

// ── Contact icon map ──────────────────────────────────────────────────────────
function ContactIcon({ type }: { type: ContactItem['type'] }) {
  const cls = "w-3 h-3 flex-shrink-0"
  if (type === 'email')    return <Mail className={cls} />
  if (type === 'phone')    return <Phone className={cls} />
  if (type === 'github')   return <Github className={cls} />
  if (type === 'linkedin') return <Linkedin className={cls} />
  if (type === 'web')      return <Globe className={cls} />
  return null
}

function ContactChip({ item, light = false }: { item: ContactItem; light?: boolean }) {
  const activeCls = light
    ? 'text-white/90 hover:text-white hover:underline'
    : 'text-blue-700 hover:text-blue-900 hover:underline'
  const inactiveCls = light
    ? 'text-white/60 cursor-default'
    : 'text-gray-400 cursor-default'

  const inner = (
    <span className="flex items-center gap-1">
      <ContactIcon type={item.type} />
      <span>{item.value}</span>
    </span>
  )

  if (item.url) {
    return (
      <a href={item.url} target={item.url.startsWith('mailto') ? undefined : '_blank'}
        rel="noopener noreferrer" className={`flex items-center gap-1 ${activeCls}`}>
        {inner}
      </a>
    )
  }
  // No URL — show dimmed with tooltip
  return (
    <span className={`flex items-center gap-1 ${inactiveCls}`}
      title="No URL found in PDF. Add the actual URL in the Edit tab to make this clickable.">
      {inner}
    </span>
  )
}

function LinkBadge({ link, color }: { link: LinkItem; color: string }) {
  const cls = `inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border ${color}`
  if (link.url) return <a href={link.url} target="_blank" rel="noopener noreferrer" className={cls + ' hover:opacity-75'}>{link.label} <ExternalLink className="w-2.5 h-2.5" /></a>
  // No URL extracted from PDF — show as styled label with tooltip hint
  return <span className={cls} title="Add the URL in the Edit tab to make this a clickable link">{link.label}</span>
}

// ── COLLEGE ──────────────────────────────────────────────────────────────────
function CollegeTemplate({ data }: { data: ResumeData }) {
  const infoContacts = data.contacts.filter(c => c.type !== 'text')
  const textContacts = data.contacts.filter(c => c.type === 'text')
  const half = Math.ceil(infoContacts.length / 2)

  return (
    <div className="font-sans text-[12px] text-gray-900 leading-snug space-y-3">
      {/* Header */}
      <div className="flex gap-3 items-start border-b-2 border-gray-600 pb-3">
        <div className="w-14 h-14 bg-gray-100 border border-gray-300 rounded flex-shrink-0 flex items-center justify-center font-bold text-gray-500 text-xs">NIT</div>
        <div className="flex-1">
          <div className="text-[18px] font-bold uppercase tracking-wide text-gray-900">{data.name}</div>
          {textContacts.length > 0 && (
            <div className="text-[11px] text-gray-500 mt-0.5">{textContacts.map(c => c.value).join('  ·  ')}</div>
          )}
          <div className="grid grid-cols-2 gap-x-6 mt-1 text-[11px]">
            <div className="space-y-0.5">{infoContacts.slice(0, half).map((c,i) => <ContactChip key={i} item={c} />)}</div>
            <div className="space-y-0.5">{infoContacts.slice(half).map((c,i)  => <ContactChip key={i} item={c} />)}</div>
          </div>
        </div>
      </div>

      {data.education.length > 0 && <ColSec title="Education">
        <table className="w-full text-[11px]">
          <thead><tr className="text-gray-500 border-b border-gray-200">
            <th className="text-left py-1 font-semibold">Institution</th>
            <th className="text-left py-1 font-semibold">Degree</th>
            <th className="text-left py-1 font-semibold">Score</th>
            <th className="text-right py-1 font-semibold">Year</th>
          </tr></thead>
          <tbody>{data.education.map((e,i) => (
            <tr key={i} className="border-b border-gray-100 last:border-0">
              <td className="py-1 pr-2 font-medium text-gray-800">{e.institution}</td>
              <td className="py-1 pr-2 text-gray-600">{e.degree}</td>
              <td className="py-1 pr-2 text-gray-600 whitespace-nowrap">{e.score}</td>
              <td className="py-1 text-gray-500 whitespace-nowrap text-right">{e.year}</td>
            </tr>
          ))}</tbody>
        </table>
      </ColSec>}

      {data.experience.length > 0 && <ColSec title="Experience">
        {data.experience.map((e,i) => (
          <div key={i} className="mb-2 last:mb-0">
            <div className="flex justify-between"><span className="font-semibold text-gray-800">{e.org}</span><span className="text-[11px] text-gray-500">{e.location}</span></div>
            <div className="flex justify-between text-[11px] text-gray-500 mt-0.5"><span className="italic">{e.role}</span><span>{e.dates}</span></div>
            {e.bullets.map((b,j) => <div key={j} className="flex gap-1.5 text-[11px] text-gray-700 mt-0.5"><span className="text-gray-400 flex-shrink-0">▸</span><span>{b}</span></div>)}
          </div>
        ))}
      </ColSec>}

      {data.projects.length > 0 && <ColSec title="Projects">
        {data.projects.map((p,i) => (
          <div key={i} className="mb-2.5 last:mb-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-gray-800">{p.name}</span>
              {p.tech && <span className="text-[11px] text-gray-500 italic">| {p.tech}</span>}
              {p.links.map((l,j) => <LinkBadge key={j} link={l} color="bg-white text-gray-600 border-gray-300" />)}
            </div>
            {p.desc.map((b,j) => <div key={j} className="flex gap-1.5 text-[11px] text-gray-700 mt-0.5"><span className="text-gray-400 flex-shrink-0">▸</span><span>{b}</span></div>)}
          </div>
        ))}
      </ColSec>}

      {data.skills.length > 0 && <ColSec title="Technical Skills &amp; Interests">
        <div className="space-y-0.5">{data.skills.map((s,i) => (
          <div key={i} className="flex gap-1 text-[11px]">
            {s.category && <span className="font-semibold text-gray-700 flex-shrink-0">{s.category}:</span>}
            <span className="text-gray-600">{s.value}</span>
          </div>
        ))}</div>
      </ColSec>}

      {data.achievements.length > 0 && <ColSec title="Achievements">
        {data.achievements.map((a,i) => <div key={i} className="flex gap-1.5 text-[11px] text-gray-700 mb-0.5"><span className="text-gray-400 flex-shrink-0">▸</span><span>{a}</span></div>)}
      </ColSec>}
    </div>
  )
}

function ColSec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="bg-gray-200 px-2 py-0.5 mb-1.5">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-700">{title}</h2>
      </div>
      <div className="px-1">{children}</div>
    </div>
  )
}

// ── CLASSIC ───────────────────────────────────────────────────────────────────
function ClassicTemplate({ data }: { data: ResumeData }) {
  return (
    <div className="font-serif text-[12.5px] text-gray-900 leading-snug space-y-4">
      <div className="text-center border-b-2 border-gray-800 pb-3">
        <h1 className="text-[22px] font-bold uppercase tracking-widest">{data.name}</h1>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1.5 text-[11px]">
          {data.contacts.filter(c=>c.type!=='text').map((c,i) => <ContactChip key={i} item={c} />)}
        </div>
        {data.contacts.filter(c=>c.type==='text').length > 0 && (
          <div className="text-[11px] text-gray-400 mt-1">{data.contacts.filter(c=>c.type==='text').map(c=>c.value).join('  ·  ')}</div>
        )}
      </div>
      {data.objective && <Sec title="Objective" bar><p className="text-sm text-gray-700 leading-relaxed">{data.objective}</p></Sec>}
      {data.education.length>0 && <Sec title="Education" bar>
        {data.education.map((e,i)=>(
          <div key={i} className="flex justify-between mb-1 last:mb-0 text-sm">
            <div><span className="font-semibold">{e.institution}</span>{e.degree&&<span className="text-gray-600"> — {e.degree}</span>}</div>
            <div className="text-gray-500 text-[11px] whitespace-nowrap ml-4">{e.score&&<span>{e.score} · </span>}{e.year}</div>
          </div>
        ))}
      </Sec>}
      {data.experience.length>0 && <Sec title="Experience" bar>
        {data.experience.map((e,i)=>(
          <div key={i} className="mb-3 last:mb-0">
            <div className="flex justify-between font-semibold text-sm"><span>{e.org}</span><span className="font-normal text-gray-500 text-[11px]">{e.dates}</span></div>
            <div className="text-[11px] text-gray-500 italic mb-1">{e.role}{e.location&&` · ${e.location}`}</div>
            {e.bullets.map((b,j)=><div key={j} className="flex gap-2 text-[11px] text-gray-700 mb-0.5"><span className="text-gray-400">▸</span><span>{b}</span></div>)}
          </div>
        ))}
      </Sec>}
      {data.projects.length>0 && <Sec title="Projects" bar>
        {data.projects.map((p,i)=>(
          <div key={i} className="mb-2.5 last:mb-0">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{p.name}</span>
              {p.tech&&<span className="text-[11px] text-gray-500 italic">({p.tech})</span>}
              {p.links.map((l,j)=><LinkBadge key={j} link={l} color="bg-gray-50 text-gray-700 border-gray-300"/>)}
            </div>
            {p.desc.map((b,j)=><div key={j} className="flex gap-2 text-[11px] text-gray-700 mt-0.5"><span className="text-gray-400">▸</span><span>{b}</span></div>)}
          </div>
        ))}
      </Sec>}
      {data.skills.length>0 && <Sec title="Skills" bar>
        <div className="space-y-0.5">{data.skills.map((s,i)=>(
          <div key={i} className="text-sm">{s.category&&<span className="font-semibold">{s.category}: </span>}<span className="text-gray-700">{s.value}</span></div>
        ))}</div>
      </Sec>}
      {data.achievements.length>0 && <Sec title="Achievements" bar>
        {data.achievements.map((a,i)=><div key={i} className="flex gap-2 text-[11px] text-gray-700 mb-0.5"><span className="text-gray-400">▸</span><span>{a}</span></div>)}
      </Sec>}
    </div>
  )
}

function Sec({ title, bar, children }: { title: string; bar?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <h2 className={`text-[11px] font-bold uppercase tracking-widest text-gray-700 pb-0.5 mb-2 ${bar ? 'border-b-2 border-gray-700' : ''}`}>{title}</h2>
      {children}
    </div>
  )
}

// ── MODERN ────────────────────────────────────────────────────────────────────
function ModernTemplate({ data }: { data: ResumeData }) {
  return (
    <div className="font-sans text-[12.5px] leading-snug">
      <div className="bg-blue-700 px-6 py-5">
        <h1 className="text-2xl font-bold text-white tracking-wide">{data.name}</h1>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-[11px]">
          {data.contacts.filter(c=>c.type!=='text').map((c,i)=><ContactChip key={i} item={c} light />)}
        </div>
      </div>
      <div className="flex gap-4 p-5">
        <div className="w-0.5 bg-blue-600 rounded flex-shrink-0" />
        <div className="flex-1 space-y-4">
          {data.education.length>0 && <MSec title="Education">
            {data.education.map((e,i)=>(
              <div key={i} className="flex justify-between text-sm mb-1 last:mb-0">
                <div><span className="font-semibold text-gray-800">{e.institution}</span>{e.degree&&<span className="text-gray-500"> — {e.degree}</span>}</div>
                <div className="text-gray-400 text-[11px] whitespace-nowrap ml-4">{e.score&&<span>{e.score} · </span>}{e.year}</div>
              </div>
            ))}
          </MSec>}
          {data.experience.length>0 && <MSec title="Experience">
            {data.experience.map((e,i)=>(
              <div key={i} className="mb-3 last:mb-0">
                <div className="flex justify-between font-semibold text-sm text-gray-800"><span>{e.org}</span><span className="font-normal text-gray-400 text-[11px]">{e.dates}</span></div>
                <div className="text-[11px] text-gray-500 italic mb-1">{e.role}{e.location&&` · ${e.location}`}</div>
                {e.bullets.map((b,j)=><div key={j} className="flex gap-2 text-[11px] text-gray-700 mb-0.5"><span className="text-blue-400">▸</span><span>{b}</span></div>)}
              </div>
            ))}
          </MSec>}
          {data.projects.length>0 && <MSec title="Projects">
            {data.projects.map((p,i)=>(
              <div key={i} className="mb-2.5 last:mb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-800">{p.name}</span>
                  {p.tech&&<span className="text-[11px] text-gray-500 italic">{p.tech}</span>}
                  {p.links.map((l,j)=><LinkBadge key={j} link={l} color="bg-blue-50 text-blue-700 border-blue-200"/>)}
                </div>
                {p.desc.map((b,j)=><div key={j} className="flex gap-2 text-[11px] text-gray-700 mt-0.5"><span className="text-blue-400">▸</span><span>{b}</span></div>)}
              </div>
            ))}
          </MSec>}
          {data.skills.length>0 && <MSec title="Technical Skills">
            <div className="space-y-0.5">{data.skills.map((s,i)=>(
              <div key={i} className="text-sm">{s.category&&<span className="font-semibold text-gray-700">{s.category}: </span>}<span className="text-gray-600">{s.value}</span></div>
            ))}</div>
          </MSec>}
          {data.achievements.length>0 && <MSec title="Achievements">
            {data.achievements.map((a,i)=><div key={i} className="flex gap-2 text-[11px] text-gray-700 mb-0.5"><span className="text-blue-400">▸</span><span>{a}</span></div>)}
          </MSec>}
        </div>
      </div>
    </div>
  )
}

function MSec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-blue-600 border-b border-blue-200 pb-0.5 mb-2">{title}</h2>
      {children}
    </div>
  )
}

// ── MINIMAL ───────────────────────────────────────────────────────────────────
function MinimalTemplate({ data }: { data: ResumeData }) {
  return (
    <div className="font-sans text-[12.5px] text-gray-800 leading-snug space-y-5">
      <div className="text-center pb-4 border-b border-gray-200">
        <h1 className="text-[22px] font-light tracking-[0.25em] uppercase text-gray-900">{data.name}</h1>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1.5 text-[11px] text-gray-500">
          {data.contacts.filter(c=>c.type!=='text').map((c,i)=><ContactChip key={i} item={c} />)}
        </div>
      </div>
      {data.education.length>0 && <MinSec title="Education">
        {data.education.map((e,i)=>(
          <div key={i} className="flex justify-between text-sm mb-1 last:mb-0">
            <div><span className="font-medium">{e.institution}</span>{e.degree&&<span className="text-gray-500"> — {e.degree}</span>}</div>
            <div className="text-gray-400 text-[11px] whitespace-nowrap ml-4">{e.score&&<span>{e.score} · </span>}{e.year}</div>
          </div>
        ))}
      </MinSec>}
      {data.experience.length>0 && <MinSec title="Experience">
        {data.experience.map((e,i)=>(
          <div key={i} className="mb-3 last:mb-0">
            <div className="flex justify-between text-sm"><span className="font-medium">{e.org}</span><span className="text-gray-400 text-[11px]">{e.dates}</span></div>
            <div className="text-[11px] text-gray-400 italic mb-1">{e.role}{e.location&&` · ${e.location}`}</div>
            {e.bullets.map((b,j)=><div key={j} className="flex gap-2 text-[11px] text-gray-600 mb-0.5"><span className="text-gray-300">▸</span><span>{b}</span></div>)}
          </div>
        ))}
      </MinSec>}
      {data.projects.length>0 && <MinSec title="Projects">
        {data.projects.map((p,i)=>(
          <div key={i} className="mb-2.5 last:mb-0">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{p.name}</span>
              {p.tech&&<span className="text-[11px] text-gray-400 italic">{p.tech}</span>}
              {p.links.map((l,j)=><LinkBadge key={j} link={l} color="bg-gray-50 text-gray-500 border-gray-200"/>)}
            </div>
            {p.desc.map((b,j)=><div key={j} className="flex gap-2 text-[11px] text-gray-600 mt-0.5"><span className="text-gray-300">▸</span><span>{b}</span></div>)}
          </div>
        ))}
      </MinSec>}
      {data.skills.length>0 && <MinSec title="Skills">
        <div className="space-y-0.5 text-sm">{data.skills.map((s,i)=>(
          <div key={i}>{s.category&&<span className="font-medium text-gray-700">{s.category}: </span>}<span className="text-gray-500">{s.value}</span></div>
        ))}</div>
      </MinSec>}
      {data.achievements.length>0 && <MinSec title="Achievements">
        {data.achievements.map((a,i)=><div key={i} className="flex gap-2 text-[11px] text-gray-600 mb-0.5"><span className="text-gray-300">▸</span><span>{a}</span></div>)}
      </MinSec>}
    </div>
  )
}

function MinSec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1">{title}</h2>
      <hr className="border-gray-200 mb-2" />
      {children}
    </div>
  )
}

// ── CREATIVE ──────────────────────────────────────────────────────────────────
function CreativeTemplate({ data }: { data: ResumeData }) {
  return (
    <div className="font-sans text-[12.5px] leading-snug">
      <div className="bg-gradient-to-r from-purple-700 to-blue-600 px-6 py-5">
        <h1 className="text-2xl font-bold text-white tracking-wide">{data.name}</h1>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-[11px]">
          {data.contacts.filter(c=>c.type!=='text').map((c,i)=><ContactChip key={i} item={c} light />)}
        </div>
      </div>
      <div className="p-5 space-y-4">
        {data.education.length>0 && <CreSec title="Education">
          {data.education.map((e,i)=>(
            <div key={i} className="flex justify-between text-sm mb-1 last:mb-0">
              <div><span className="font-semibold text-gray-800">{e.institution}</span>{e.degree&&<span className="text-gray-500"> — {e.degree}</span>}</div>
              <div className="text-gray-400 text-[11px] whitespace-nowrap ml-4">{e.score&&<span>{e.score} · </span>}{e.year}</div>
            </div>
          ))}
        </CreSec>}
        {data.experience.length>0 && <CreSec title="Experience">
          {data.experience.map((e,i)=>(
            <div key={i} className="mb-3 last:mb-0">
              <div className="flex justify-between font-semibold text-sm text-gray-800"><span>{e.org}</span><span className="font-normal text-gray-400 text-[11px]">{e.dates}</span></div>
              <div className="text-[11px] text-gray-500 italic mb-1">{e.role}{e.location&&` · ${e.location}`}</div>
              {e.bullets.map((b,j)=><div key={j} className="flex gap-2 text-[11px] text-gray-700 mb-0.5"><span className="text-purple-400">▸</span><span>{b}</span></div>)}
            </div>
          ))}
        </CreSec>}
        {data.projects.length>0 && <CreSec title="Projects">
          {data.projects.map((p,i)=>(
            <div key={i} className="mb-2.5 last:mb-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-800">{p.name}</span>
                {p.tech&&<span className="text-[11px] text-gray-500 italic">{p.tech}</span>}
                {p.links.map((l,j)=><LinkBadge key={j} link={l} color="bg-purple-50 text-purple-700 border-purple-200"/>)}
              </div>
              {p.desc.map((b,j)=><div key={j} className="flex gap-2 text-[11px] text-gray-700 mt-0.5"><span className="text-purple-400">▸</span><span>{b}</span></div>)}
            </div>
          ))}
        </CreSec>}
        {data.skills.length>0 && <CreSec title="Technical Skills">
          <div className="space-y-0.5">{data.skills.map((s,i)=>(
            <div key={i} className="text-sm">{s.category&&<span className="font-semibold text-gray-700">{s.category}: </span>}<span className="text-gray-600">{s.value}</span></div>
          ))}</div>
        </CreSec>}
        {data.achievements.length>0 && <CreSec title="Achievements">
          {data.achievements.map((a,i)=><div key={i} className="flex gap-2 text-[11px] text-gray-700 mb-0.5"><span className="text-purple-400">▸</span><span>{a}</span></div>)}
        </CreSec>}
      </div>
    </div>
  )
}

function CreSec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-purple-700 border-b border-purple-200 pb-0.5 mb-2">{title}</h2>
      {children}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
interface Props { resume: Resume }

export default function TemplatePreview({ resume }: Props) {
  const data = parseResume(resume.content)
  const template = resume.templateName || 'classic'
  const nopad = template === 'modern' || template === 'creative'

  const missingLinks = [
    ...data.contacts.filter(c => (c.type === 'github' || c.type === 'linkedin') && !c.url),
    ...data.projects.flatMap(p => p.links.filter(l => !l.url)),
  ]

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => window.print()} className="flex items-center gap-2 text-sm btn-secondary">
          <Printer size={14} /> Download / Print
        </button>
      </div>
      {missingLinks.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          <span className="flex-shrink-0 mt-0.5">⚠</span>
          <span>
            <strong>{missingLinks.length} link{missingLinks.length > 1 ? 's' : ''}</strong> (
            {missingLinks.map((l,i) => <span key={i}>{i > 0 && ', '}{'label' in l ? l.label : l.value}</span>)}
            ) have no URL — they came from the PDF as plain text.
            Go to the <strong>Edit</strong> tab and replace them with actual URLs like{' '}
            <code className="bg-amber-100 px-1 rounded">https://github.com/yourusername</code>.
          </span>
        </div>
      )}
      <div id="resume-print-area" className={`bg-white rounded-xl border border-gray-200 shadow-sm min-h-[600px] ${nopad ? 'overflow-hidden' : 'p-6'}`}>
        {template === 'classic'  && <ClassicTemplate  data={data} />}
        {template === 'modern'   && <ModernTemplate   data={data} />}
        {template === 'minimal'  && <MinimalTemplate  data={data} />}
        {template === 'creative' && <CreativeTemplate data={data} />}
        {template === 'college'  && <CollegeTemplate  data={data} />}
      </div>
      <style>{`
        @media print {
          @page { margin: 0.5in; size: A4 portrait; }
          html, body { height: auto !important; overflow: visible !important; }
          body > * { visibility: hidden !important; }
          #resume-print-area, #resume-print-area * { visibility: visible !important; }
          #resume-print-area {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: 0 !important;
            background: white !important;
          }
        }
      `}</style>
    </div>
  )
}
