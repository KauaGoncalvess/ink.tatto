import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";

/**
 * Leituras do conteúdo público (serviços, artistas, galeria, depoimentos).
 *
 * Tudo passa por `cache` do React para deduplicar dentro de um render — a home
 * e o layout pedem os mesmos dados e só uma query chega ao banco.
 */

export const getFeaturedServices = cache(async (limit = 4) => {
  return prisma.service.findMany({
    where: { isActive: true, isFeatured: true },
    orderBy: [{ displayOrder: "asc" }],
    take: limit,
    select: {
      id: true,
      slug: true,
      name: true,
      shortDescription: true,
      icon: true,
      imageUrl: true,
      durationMin: true,
      priceFrom: true,
    },
  });
});

export const getAllServices = cache(async () => {
  return prisma.service.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }],
    include: {
      artists: {
        where: { artist: { isActive: true } },
        select: {
          priceFrom: true,
          artist: { select: { id: true, slug: true, name: true, handle: true } },
        },
      },
    },
  });
});

export const getActiveArtists = cache(async (limit?: number) => {
  return prisma.artist.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    ...(limit ? { take: limit } : {}),
    select: {
      id: true,
      slug: true,
      name: true,
      handle: true,
      shortBio: true,
      avatarUrl: true,
      specialties: true,
      instagram: true,
    },
  });
});

export const getArtistBySlug = cache(async (slug: string) => {
  return prisma.artist.findFirst({
    where: { slug, isActive: true },
    include: {
      services: {
        where: { service: { isActive: true } },
        select: {
          priceFrom: true,
          service: {
            select: {
              id: true,
              slug: true,
              name: true,
              shortDescription: true,
              durationMin: true,
              priceFrom: true,
              icon: true,
            },
          },
        },
      },
      availability: { orderBy: { dayOfWeek: "asc" } },
      galleryItems: {
        where: { isPublished: true },
        orderBy: { displayOrder: "asc" },
        take: 8,
        select: {
          id: true,
          title: true,
          style: true,
          imageUrl: true,
          alt: true,
          description: true,
          bodyPart: true,
        },
      },
    },
  });
});

/** Slugs dos artistas — alimenta generateStaticParams e o sitemap. */
export const getArtistSlugs = cache(async () => {
  const artists = await prisma.artist.findMany({
    where: { isActive: true },
    select: { slug: true },
  });
  return artists.map((artist) => artist.slug);
});

export const getGalleryItems = cache(
  async ({ limit, style }: { limit?: number; style?: string } = {}) => {
    const items = await prisma.galleryItem.findMany({
      where: {
        isPublished: true,
        ...(style && style !== "todos" ? { style } : {}),
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      ...(limit ? { take: limit } : {}),
      select: {
        id: true,
        title: true,
        style: true,
        imageUrl: true,
        alt: true,
        description: true,
        bodyPart: true,
        artist: { select: { name: true } },
      },
    });

    return items.map((item) => ({
      id: item.id,
      title: item.title,
      style: item.style,
      imageUrl: item.imageUrl,
      alt: item.alt,
      description: item.description,
      bodyPart: item.bodyPart,
      artistName: item.artist?.name ?? null,
    }));
  },
);

/** Estilos distintos presentes na galeria — alimenta os filtros. */
export const getGalleryStyles = cache(async () => {
  const rows = await prisma.galleryItem.findMany({
    where: { isPublished: true },
    distinct: ["style"],
    orderBy: { style: "asc" },
    select: { style: true },
  });
  return rows.map((row) => row.style);
});

export const getTestimonials = cache(async (limit?: number) => {
  const items = await prisma.testimonial.findMany({
    where: { isPublished: true },
    orderBy: [{ displayOrder: "asc" }],
    ...(limit ? { take: limit } : {}),
    select: {
      id: true,
      clientName: true,
      avatarUrl: true,
      rating: true,
      content: true,
      serviceName: true,
      artist: { select: { name: true } },
    },
  });

  return items.map((item) => ({
    id: item.id,
    clientName: item.clientName,
    avatarUrl: item.avatarUrl,
    rating: item.rating,
    content: item.content,
    serviceName: item.serviceName,
    artistName: item.artist?.name ?? null,
  }));
});

/** Configurações públicas do estúdio, com fallback para o config estático. */
export const getStudioSettings = cache(async () => {
  return prisma.studioSettings.findUnique({
    where: { id: "studio" },
    include: { openingHours: { orderBy: { dayOfWeek: "asc" } } },
  });
});
