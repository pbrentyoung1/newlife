const transitions = {
  publish: {
    source: "approved",
    result: "published",
    update: "state = 'published', published_at = UTC_TIMESTAMP()",
  },
  withdraw: {
    source: "published",
    result: "withdrawn",
    update: "state = 'withdrawn'",
  },
};

export function validateEditorialRequest(action, slug, actor) {
  if (action !== "publish" && action !== "withdraw") throw new Error("Invalid editorial action");
  if (!slug || slug.length > 180 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Invalid sermon slug");
  }
  if (!actor?.trim() || actor.trim().length > 200) throw new Error("An editorial actor is required");
}

export async function changePublication(connection, action, slug, actor) {
  validateEditorialRequest(action, slug, actor);
  const transition = transitions[action];
  await connection.beginTransaction();
  try {
    const [[sermon]] = await connection.execute(
      "SELECT id, state FROM sermons WHERE slug = ? FOR UPDATE",
      [slug],
    );
    if (!sermon) {
      await connection.rollback();
      return { outcome: "missing" };
    }
    if (sermon.state === transition.result) {
      await connection.commit();
      return { outcome: "unchanged", state: sermon.state };
    }
    if (sermon.state !== transition.source) {
      await connection.rollback();
      return { outcome: "invalid", state: sermon.state };
    }

    await connection.execute(`UPDATE sermons SET ${transition.update} WHERE id = ?`, [sermon.id]);
    await connection.execute(
      "INSERT INTO sermon_publication_events (sermon_id, action, actor) VALUES (?, ?, ?)",
      [sermon.id, action, actor.trim()],
    );
    await connection.commit();
    return { outcome: "changed", state: transition.result };
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  }
}
