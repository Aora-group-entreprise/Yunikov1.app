import { Router, type Request } from "express";
import { authMiddleware } from "../middlewares/auth";
import { eq, ilike, publicUser, selectRows, sortRows, supabaseError } from "../lib/supabase";

const usersRouter = Router();
type AuthenticatedRequest = Request & { userId?: number };

usersRouter.get("/users/search", authMiddleware, async (req, res) => {
  const query = String(req.query["q"] ?? "").trim();
  if (query.length < 2) return res.json({ users: [] });

  try {
    const pattern = `%${query.toLowerCase()}%`;
    const [byUsername, byDisplayName] = await Promise.all([
      selectRows("users", {
        select: "id,username,display_name,avatar_url,bio,country_flag",
        filters: [ilike("username", pattern)],
        limit: 20,
      }),
      selectRows("users", {
        select: "id,username,display_name,avatar_url,bio,country_flag",
        filters: [ilike("displayName", pattern)],
        limit: 20,
      }),
    ]);
    const users = sortRows(
      Array.from(new Map([...byUsername, ...byDisplayName].map((user) => [user.id, user])).values()),
      "displayName",
    ).slice(0, 20);
    return res.json({ users });
  } catch (err) {
    return supabaseError(res, err);
  }
});

async function buildUserProfileResponse(id: number, viewerId: number) {
  const [user] = await selectRows("users", { filters: [eq("id", id)], limit: 1 });
  if (!user) return null;

  const [posts, followsToUser, followsFromUser, currentFollow, settings] = await Promise.all([
    selectRows("posts", { filters: [eq("userId", id)], order: { column: "createdAt", ascending: false }, limit: 100 }),
    selectRows("follows", { filters: [eq("followingId", id)] }),
    selectRows("follows", { filters: [eq("followerId", id)] }),
    selectRows("follows", { filters: [eq("followerId", viewerId), eq("followingId", id)], limit: 1 }),
    selectRows("user_settings", { filters: [eq("userId", id)], limit: 1 }),
  ]);

  const privateAccount = Boolean(settings[0]?.privateAccount);
  const viewerIsOwner = viewerId === id;
  const viewerFollows = currentFollow.length > 0;
  if (privateAccount && !viewerIsOwner && !viewerFollows) {
    return {
      user: publicUser(user),
      posts: [],
      stats: { posts: 0, followers: followsToUser.length, following: followsFromUser.length },
      following: false,
      privateAccount: true,
    };
  }

  const enrichedPosts = await Promise.all(posts.map(async (post) => {
    const postId = Number(post.id);
    const [postImages, postVideos] = await Promise.all([
      selectRows("post_images", { filters: [eq("postId", postId)], order: { column: "position", ascending: true } }).catch(() => []),
      selectRows("post_videos", { filters: [eq("postId", postId)], order: { column: "position", ascending: true } }).catch(() => []),
    ]);
    return {
      ...post,
      images: postImages,
      videos: postVideos,
      likes: [],
      saves: [],
      reposts: [],
    };
  }));

  return {
    user: publicUser(user),
    posts: enrichedPosts,
    stats: { posts: enrichedPosts.length, followers: followsToUser.length, following: followsFromUser.length },
    following: viewerFollows,
    privateAccount,
  };
}

usersRouter.get("/users/by-username/:username", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const username = String(req.params["username"] ?? "").trim().toLowerCase();
  if (!username) return res.status(400).json({ error: "Invalid username" });

  try {
    const [user] = await selectRows("users", { filters: [eq("username", username)], limit: 1 });
    if (!user) return res.status(404).json({ error: "User not found" });
    const result = await buildUserProfileResponse(Number(user.id), Number(req.userId));
    return res.json(result);
  } catch (err) {
    return supabaseError(res, err);
  }
});

usersRouter.get("/users/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid user id" });

  try {
    const result = await buildUserProfileResponse(id, Number(req.userId));
    if (!result) return res.status(404).json({ error: "User not found" });
    return res.json(result);
  } catch (err) {
    return supabaseError(res, err);
  }
});

export default usersRouter;