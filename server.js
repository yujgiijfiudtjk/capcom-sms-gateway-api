const express = require("express");
const cors    = require("cors");
const axios   = require("axios");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ইনস্টাগ্রামের জন্য কমন ব্রাউজার হেডার
const INSTA_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://www.instagram.com/",
  "Origin": "https://www.instagram.com"
};

// ডাটা ম্যাপিং হেল্পার ফাংশন
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
    followers: u.edge_followed_by?.count ?? u.followers_count ?? 0,
    following: u.edge_follow?.count ?? u.follows_count ?? 0,
    posts: u.edge_owner_to_timeline_media?.count ?? u.media_count ?? 0,
    is_business_account: u.is_business_account || false,
    business_category: u.business_category_name || null
  };
}

/* ─── 1. ROOT ROUTE ─────────────────────────────────────────── */
app.get("/", (req, res) => {
  res.json({ status: "✅ Instagram Lookup API Server is Running!" });
});

/* ─── 2. INSTAGRAM DATA ENDPOINT ─────────────────────────────── */
app.get("/instagram/:username", async (req, res) => {
  const { username } = req.params;

  if (!username) {
    return res.status(400).json({ success: false, error: "Username is required" });
  }

  // RapidAPI কি এনভায়রনমেন্ট ভ্যারিয়েবল (Render Settings) থেকে নিবে
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

  /* ── Method 1: RapidAPI Gateway (100% সুরক্ষিত ও ওয়ার্কিং) ── */
  if (RAPIDAPI_KEY) {
    try {
      const response = await axios.get(`https://instagram-data-provider.p.rapidapi.com/v1/user_info`, {
        params: { username: username },
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'instagram-data-provider.p.rapidapi.com'
        },
        timeout: 9000
      });

      if (response.data) {
        const u = response.data;
        return res.json({
          success: true,
          username: username,
          id: u.id || null,
          nickname: u.full_name || username,
          avatar: u.profile_pic_url_hd || u.profile_pic_url || null,
          bio: u.biography || "",
          verified: u.is_verified || false,
          privateAccount: u.is_private || false,
          followers: u.followers_count || u.edge_followed_by?.count || 0,
          following: u.follows_count || u.edge_follow?.count || 0,
          posts: u.media_count || u.edge_owner_to_timeline_media?.count || 0
        });
      }
    } catch (e) {
      console.log("RapidAPI failed, switching to local backup query...", e.message);
    }
  }

  /* ── Method 2: Web Profile API Query (সার্ভার ব্যাকআপ মেথড) ── */
  try {
    const webApiUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
    const response = await axios.get(webApiUrl, {
      timeout: 8000,
      headers: {
        ...INSTA_HEADERS,
        "X-IG-App-ID": "936619743392459", // মেটার অফিসিয়াল পাবলিক ওয়েব অ্যাপ আইডি
        "Accept": "*/*"
      }
    });

    const userObj = response.data?.data?.user;
    if (userObj) {
      return res.json(mapInstagramUser(userObj, username));
    }
  } catch (e) {
    console.log("Method 2 (Web API) failed due to Render IP block:", e.message);
  }

  /* ── Method 3: Official oEmbed API (লাস্ট ফলব্যাক) ── */
  try {
    const profileUrl = `https://www.instagram.com/${username}/`;
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(profileUrl)}`;
    const response = await axios.get(oembedUrl, { timeout: 6000 });
    
    if (response.data?.author_name) {
      return res.json({
        success: true,
        username: username,
        id: response.data.author_id || null,
        nickname: response.data.author_name,
        avatar: response.data.thumbnail_url || null,
        bio: `Instagram Profile of ${response.data.author_name}`,
        verified: false,
        privateAccount: null,
        followers: null, // ওএম্বেড মেথডে ফলোয়ার আসে না
        following: null,
        posts: null
      });
    }
  } catch (e) {
    console.log("Method 3 (oEmbed) failed too:", e.message);
  }

  // সব মেথড ফেইল করলে এরর রিটার্ন করবে
  return res.status(404).json({ 
    success: false, 
    error: "Could not fetch Instagram data. Account might be private, restricted, or server IP is blocked." 
  });
});

/* ─── SERVER START ─────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`🚀 New Instagram Server is active on port ${PORT}`);
});
    
