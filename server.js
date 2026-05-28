const express = require("express");
const cors    = require("cors");
const axios   = require("axios");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/* ─── Browser-like Headers to prevent quick rate limits ───────── */
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/124.0.0.0 Safari/537.36",
  "Accept":          "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer":         "https://www.instagram.com/",
  "Origin":          "https://www.instagram.com",
  "sec-fetch-site":  "same-origin",
  "sec-fetch-mode":  "cors",
  "sec-fetch-dest":  "empty",
};

/* ─── Map Instagram API Object → Standard Clean Response ─────── */
function mapInstagramUser(u, username) {
  return {
    success: true,
    username: u.username || username,
    id: u.id || null,
    nickname: u.full_name || u.username || username,
    avatar: u.profile_pic_url_hd || u.profile_pic_url || null,
    bio: u.biography || "",
    external_link: u.external_url || null,
    verified: u.is_verified || false,
    privateAccount: u.is_private || false,
    
    // Stats
    followers: u.edge_followed_by?.count ?? u.followers_count ?? null,
    following: u.edge_follow?.count ?? u.following_count ?? null,
    posts: u.edge_owner_to_timeline_media?.count ?? u.media_count ?? null,
    
    // Additional Profile Flags
    is_business_account: u.is_business_account || false,
    business_category: u.business_category_name || null,
    is_joined_recently: u.is_joined_recently || false,
    is_guardian_of_viewer: u.is_guardian_of_viewer || false
  };
}

/* ─── Route ─────────────────────────────────────────────────── */
app.get("/instagram/:username", async (req, res) => {
  const { username } = req.params;

  if (!username) {
    return res.status(400).json({ success: false, error: "Username is required" });
  }

  /* ── Attempt 1: Instagram's Internal Advanced Query Endpoint ── */
  try {
    // __a=1 & __d=dis ensures Instagram delivers raw data directly in JSON
    const internalUrl = `https://www.instagram.com/${username}/?__a=1&__d=dis`;
    const response = await axios.get(internalUrl, {
      timeout: 10000,
      headers: {
        ...BROWSER_HEADERS,
        "Accept": "application/json"
      }
    });

    const userObj = response.data?.graphql?.user || response.data?.user;
    if (userObj && (userObj.username || userObj.id)) {
      return res.json(mapInstagramUser(userObj, username));
    }
  } catch (e) {
    console.log("Attempt 1 (Internal JSON API) failed:", e.message);
  }

  /* ── Attempt 2: Web API User Profile JSON Query ── */
  try {
    const webApiUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
    const response = await axios.get(webApiUrl, {
      timeout: 10000,
      headers: {
        ...BROWSER_HEADERS,
        "X-IG-App-ID": "936619743392459", // Essential Meta App ID to query public info
      }
    });

    const userObj = response.data?.data?.user;
    if (userObj && userObj.username) {
      return res.json(mapInstagramUser(userObj, username));
    }
  } catch (e) {
    console.log("Attempt 2 (Web Profile API) failed:", e.message);
  }

  /* ── Attempt 3: Meta's Official oEmbed API (Minimal Safe Data) ── */
  try {
    const profileUrl = `https://www.instagram.com/${username}/`;
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(profileUrl)}`;
    
    const response = await axios.get(oembedUrl, { timeout: 8000 });
    
    if (response.data?.author_name) {
      return res.json({
        success: true,
        username: username,
        id: response.data.author_id || null,
        nickname: response.data.author_name,
        avatar: response.data.thumbnail_url || null,
        bio: `Instagram Profile of ${response.data.author_name}`,
        external_link: null,
        verified: false,
        privateAccount: null,
        followers: null, // Meta oEmbed doesn't include follow metrics for security
        following: null,
        posts: null,
        is_business_account: false,
        business_category: null,
        is_joined_recently: false,
        is_guardian_of_viewer: false
      });
    }
  } catch (e) {
    console.log("Attempt 3 (oEmbed) failed:", e.message);
  }

  // If all attempts are blocked or rate-limited
  return res.status(404).json({ 
    success: false, 
    error: "Could not fetch Instagram data. Account might be private, restricted, or rate limited." 
  });
});

app.get("/", (req, res) => res.json({ status: "✅ Instagram JSON Data API running!" }));
app.listen(PORT, () => console.log(`🚀 Instagram Server active on port ${PORT}`));
    
