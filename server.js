/* ─── INSTAGRAM DATA ROUTE (FIXED) ─────────────────────────── */

// মেটার ফেসবুক ডেভেলপার ড্যাশবোর্ড থেকে পাওয়া টোকেন (যদি থাকে)
// টোকেন ছাড়া চালালে এটি স্ক্র্যাপিং প্রক্সি মোডে চলে যাবে
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_TOKEN || "YOUR_META_ACCESS_TOKEN";

app.get("/instagram/:username", async (req, res) => {
  const { username } = req.params;

  if (!username) {
    return res.status(400).json({ success: false, error: "Username is required" });
  }

  /* ── Attempt 1: Meta Graph API (সবচেয়ে নিরাপদ ও পারফেক্ট) ── */
  if (INSTAGRAM_ACCESS_TOKEN && INSTAGRAM_ACCESS_TOKEN !== "YOUR_META_ACCESS_TOKEN") {
    try {
      // ইনস্টাগ্রামের বিজনেস ডিসকভারি এন্ডপয়েন্ট
      const graphUrl = `https://graph.facebook.com/v20.0/me?fields=business_discovery.username(${username}){id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count}&access_token=${INSTAGRAM_ACCESS_TOKEN}`;
      
      const response = await axios.get(graphUrl, { timeout: 10000 });
      const u = response.data?.business_discovery;

      if (u) {
        return res.json({
          success: true,
          username: u.username,
          id: u.id,
          nickname: u.name || u.username,
          avatar: u.profile_picture_url,
          bio: u.biography || "",
          verified: null,
          privateAccount: false,
          followers: u.followers_count,
          following: u.follows_count,
          posts: u.media_count
        });
      }
    } catch (e) {
      console.log("Meta Graph API failed, trying fallback...", e.message);
    }
  }

  /* ── Attempt 2: Public Proxy / Unofficial Access Token Method ── */
  try {
    // সরাসরি ইনস্টাগ্রামের প্রোফাইল এপিআই (মোবাইল অ্যাপের হেডার দিয়ে নকল করা)
    const mobileApiUrl = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
    
    const response = await axios.get(mobileApiUrl, {
      timeout: 10000,
      headers: {
        "User-Agent": "Instagram 146.0.0.27.125 Android (24/7.0; 480dpi; 1080x1920; Sony; G3121; G3121; qcom; en_US)",
        "X-IG-App-ID": "936619743392459", // মেটার ভ্যালিড ওয়েব অ্যাপ আইডি
        "Accept": "*/*"
      }
    });

    const u = response.data?.data?.user;
    if (u) {
      return res.json({
        success: true,
        username: u.username,
        id: u.id,
        nickname: u.full_name || u.username,
        avatar: u.profile_pic_url_hd || u.profile_pic_url,
        bio: u.biography || "",
        verified: u.is_verified || false,
        privateAccount: u.is_private || false,
        followers: u.edge_followed_by?.count || 0,
        following: u.edge_follow?.count || 0,
        posts: u.edge_owner_to_timeline_media?.count || 0
      });
    }
  } catch (e) {
    console.log("Attempt 2 failed:", e.message);
  }

  /* ── Attempt 3: RapidAPI বা থার্ডপার্টি ডেডিকেটেড এন্ডপয়েন্ট (বিকল্প সমাধান) ── */
  // যদি আপনার সার্ভারের আইপি (Render IP) ইনস্টাগ্রাম পাকাপাকিভাবে ব্লক করে দেয়, 
  // তবে একটি ফ্রি RapidAPI কি (Key) ব্যবহার করতে পারেন যা কখনো ব্লক খাবে না।
  try {
    const response = await axios.get(`https://instagram-data-provider.p.rapidapi.com/v1/user_info`, {
      params: { username: username },
      headers: {
        'X-RapidAPI-Key': 'YOUR_FREE_RAPIDAPI_KEY',
        'X-RapidAPI-Host': 'instagram-data-provider.p.rapidapi.com'
      },
      timeout: 8000
    });

    if (response.data?.success) {
      return res.json(response.data);
    }
  } catch (e) {
    console.log("RapidAPI Fallback failed too.");
  }

  return res.status(404).json({ 
    success: false, 
    error: "Instagram rate-limited this request. Please try again in a few minutes or use a proxy." 
  });
});
