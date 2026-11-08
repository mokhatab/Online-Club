'use strict';

/**
 * Layer: service (events). Emits 'event.published' so the marketing module
 * can announce new events to connected toolkits.
 */
const repo = require('./repository');
const { slugify } = require('../../utils/slug');
const { HttpError } = require('../../core/errors');
const { emit } = require('../../core/eventBus');

function withAvailability(row) {
  if (!row) return row;
  const booked = Number(row.booked_seats || 0);
  return { ...row, seats_left: Math.max(0, row.capacity - booked) };
}

function listEvents(query) {
  const { rows, total } = repo.list(query);
  return { rows: rows.map(withAvailability), total };
}

function getEvent({ id, slug }) {
  const row = id ? repo.findById(id) : repo.findBySlug(slug);
  if (!row) throw HttpError.notFound('Event not found');
  return withAvailability(row);
}

function ensureUniqueSlug(base, ignoreId) {
  let slug = slugify(base);
  if (!slug) slug = `event-${Date.now()}`;
  let candidate = slug;
  let i = 2;
  while (repo.slugExists(candidate)) {
    const existing = repo.findBySlug(candidate);
    if (existing && existing.id === ignoreId) break;
    candidate = `${slug}-${i++}`;
  }
  return candidate;
}

function createEvent(data, createdBy) {
  const event = repo.create({
    title: data.title,
    slug: ensureUniqueSlug(data.slug || data.title),
    description: data.description ?? '',
    category: data.category ?? 'meetup',
    location: data.location ?? '',
    starts_at: data.starts_at,
    ends_at: data.ends_at ?? null,
    capacity: data.capacity ?? 50,
    price_cents: data.price_cents ?? 0,
    currency: data.currency ?? 'USD',
    image_url: data.image_url ?? null,
    status: data.status ?? 'published',
    created_by: createdBy,
  });
  if (event.status === 'published') emit('event.published', { event: publicEvent(event) });
  return withAvailability(event);
}

function updateEvent(id, patch) {
  const current = repo.findById(id);
  if (!current) throw HttpError.notFound('Event not found');
  if (patch.slug || patch.title) {
    patch.slug = ensureUniqueSlug(patch.slug || patch.title, id);
  }
  const updated = repo.update(id, patch);
  if (current.status !== 'published' && updated.status === 'published') {
    emit('event.published', { event: publicEvent(updated) });
  }
  return withAvailability(updated);
}

function deleteEvent(id) {
  if (!repo.remove(id)) throw HttpError.notFound('Event not found');
  return { deleted: true };
}

function publicEvent(e) {
  return {
    id: e.id, title: e.title, slug: e.slug, category: e.category,
    location: e.location, starts_at: e.starts_at, price_cents: e.price_cents, currency: e.currency,
  };
}

function listCategories() {
  return repo.categories();
}

module.exports = { listEvents, getEvent, createEvent, updateEvent, deleteEvent, listCategories, publicEvent };
