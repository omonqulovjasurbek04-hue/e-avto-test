import { apiGet, apiGetPage, apiPost } from "./api";
import i18n from "@/i18n";

/** CMS texts come in the visitor's language (the server falls back to uz for anything not translated). */
export const contentLanguage = () => i18n.resolvedLanguage ?? i18n.language ?? "uz";
const lang = () => ({ lang: contentLanguage() });

export interface SiteSettings {
  siteName?: string;
  tagline?: string;
  phone?: string;
  email?: string;
  address?: string;
  workingHours?: string;
  logoUrl?: string;
  brandColor?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  /** Training centres for the contact page map. */
  branches?: Branch[];
  /** https://t.me/<bot>, sent by the server when the Telegram bot is configured. */
  telegramBot?: string;
}

export interface Branch { name: string; address: string }

export interface PublicPage { slug: string; title: string; content: string; seoTitle: string | null; seoDescription: string | null; updatedAt: string }
export interface NewsItem { slug: string; title: string; summary: string | null; coverUrl: string | null; publishedAt: string }
export interface NewsArticle extends NewsItem { content: string; seoTitle: string | null; seoDescription: string | null }
export interface PublicFaq { id: string; question: string; answer: string }
export interface PublicStats { users: number; questions: number; testsTaken: number; passRate: number | null }

export const siteService = {
  settings: () => apiGet<SiteSettings>("/site-settings", lang()),
  stats: () => apiGet<PublicStats>("/public-stats"),
  page: (slug: string) => apiGet<PublicPage>(`/pages/${slug}`, lang()),
  news: (page = 1) => apiGetPage<NewsItem>("/news", { page, limit: 9, ...lang() }),
  article: (slug: string) => apiGet<NewsArticle>(`/news/${slug}`, lang()),
  faq: () => apiGet<PublicFaq[]>("/faq", lang()),
  contact: (d: { name: string; contact: string; message: string; website?: string }) => apiPost<{ received: boolean }>("/contact", d),
};
