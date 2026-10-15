import { apiGet, apiGetPage, apiPost } from "./api";

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
}

export interface PublicPage { slug: string; title: string; content: string; seoTitle: string | null; seoDescription: string | null; updatedAt: string }
export interface NewsItem { slug: string; title: string; summary: string | null; coverUrl: string | null; publishedAt: string }
export interface NewsArticle extends NewsItem { content: string; seoTitle: string | null; seoDescription: string | null }
export interface PublicFaq { id: string; question: string; answer: string }
export interface PublicStats { users: number; questions: number; testsTaken: number; passRate: number | null }

export const siteService = {
  settings: () => apiGet<SiteSettings>("/site-settings"),
  stats: () => apiGet<PublicStats>("/public-stats"),
  page: (slug: string) => apiGet<PublicPage>(`/pages/${slug}`),
  news: (page = 1) => apiGetPage<NewsItem>("/news", { page, limit: 9 }),
  article: (slug: string) => apiGet<NewsArticle>(`/news/${slug}`),
  faq: () => apiGet<PublicFaq[]>("/faq"),
  contact: (d: { name: string; contact: string; message: string; website?: string }) => apiPost<{ received: boolean }>("/contact", d),
};
