import { FadeIn } from "@/components/FadeIn";

interface Post {
  platform: "reddit" | "tiktok";
  handle: string;
  community: string;
  body: string;
  metric1: string;
  metric2: string;
}

const redditPosts: Post[] = [
  {
    platform: "reddit",
    handle: "u/sk**n_a**ict",
    community: "r/SkincareAddiction",
    body: "Been using retinol and glycolic acid together for 3 weeks. My skin is red, tight, and peeling constantly. Did I destroy my moisture barrier? How do I even know what went wrong?",
    metric1: "2.4k upvotes",
    metric2: "318 comments",
  },
  {
    platform: "reddit",
    handle: "u/gl**wup_s**ker",
    community: "r/tretinoin",
    body: "Started tretinoin 8 weeks ago, still breaking out in new places every week. How do I actually tell the difference between purging and the product just being wrong for my skin?",
    metric1: "1.8k upvotes",
    metric2: "241 comments",
  },
  {
    platform: "reddit",
    handle: "u/sk**nc*re_35",
    community: "r/30PlusSkincare",
    body: "Spent £300 on actives a skincare influencer swore by. Retinol, AHA, Vitamin C — all layered together. My barrier is completely wrecked. Starting from scratch. I just wish someone had warned me.",
    metric1: "3.1k upvotes",
    metric2: "407 comments",
  },
  {
    platform: "reddit",
    handle: "u/m**tur*_skin",
    community: "r/30PlusSkincare",
    body: "I've been buying anti-ageing serums for 10 years. Just found out that two of my 'hero' products contain ingredients that cancel each other out at the molecular level. The brands definitely know this.",
    metric1: "4.2k upvotes",
    metric2: "512 comments",
  },
];

const tiktokPosts: Post[] = [
  {
    platform: "tiktok",
    handle: "@sk**c*re_j**n",
    community: "SkincareRoutine",
    body: "wait so I've been using benzoyl peroxide + retinol together for MONTHS and they literally cancel each other out?? I spent £80 on products that were doing absolutely nothing the whole time 💀",
    metric1: "14.2k likes",
    metric2: "893 comments",
  },
  {
    platform: "tiktok",
    handle: "@gl**up_g**l",
    community: "SkincareTok",
    body: "the influencer said add vitamin c + niacinamide + retinol all in the same routine. three weeks later: barrier completely destroyed, purging everywhere, skin worse than before I started 😭 please do your research first",
    metric1: "22.7k likes",
    metric2: "1.4k comments",
  },
  {
    platform: "tiktok",
    handle: "@sk**_ob**ssed",
    community: "GlowTok",
    body: "nobody tells you that the more products you add the more things that can go wrong. 9 products deep and my skin has genuinely never been worse. less really is more and I learned that the hard way",
    metric1: "9.8k likes",
    metric2: "641 comments",
  },
  {
    platform: "tiktok",
    handle: "@ro**tin*_girl",
    community: "SkincareRoutine",
    body: "my dermatologist just told me that fungal acne and regular acne need completely opposite treatments. I've been using the wrong products for 6 months because no app or influencer flagged this. wildly irresponsible",
    metric1: "31.5k likes",
    metric2: "2.1k comments",
  },
];

function selectPosts(style: "mixed" | "reddit" | "tiktok"): Post[] {
  if (style === "reddit") return [...redditPosts.slice(0, 4), ...tiktokPosts.slice(0, 2)];
  if (style === "tiktok") return [...tiktokPosts.slice(0, 4), ...redditPosts.slice(0, 2)];
  return [...redditPosts.slice(0, 3), ...tiktokPosts.slice(0, 3)];
}

function RedditCard({ post, delay }: { post: Post; delay: number }) {
  return (
    <FadeIn delay={delay} fullWidth>
      <div className="flex flex-col gap-3 p-5 rounded-2xl bg-white border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 h-full">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#FF4500]/10 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-[#FF4500]" viewBox="0 0 20 20" fill="currentColor">
              <circle cx="10" cy="10" r="10" className="fill-[#FF4500]" />
              <path fill="white" d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.08 2.13.45a1 1 0 1 0 .14-.53l-2.38-.5a.26.26 0 0 0-.31.2l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .57-1.37zM7 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.6 2.71a3.58 3.58 0 0 1-2.6.79 3.58 3.58 0 0 1-2.6-.79.27.27 0 0 1 .38-.38 3.07 3.07 0 0 0 2.22.62 3.07 3.07 0 0 0 2.22-.62.27.27 0 0 1 .38.38zM13 12a1 1 0 1 1 1-1 1 1 0 0 1-1 1z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#FF4500]">{post.community}</p>
            <p className="text-[10px] text-muted-foreground/50">{post.handle}</p>
          </div>
        </div>
        <p className="text-sm text-foreground leading-relaxed flex-1">"{post.body}"</p>
        <div className="flex items-center gap-3 pt-1 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-8 8h5v8h6v-8h5z"/></svg>
            {post.metric1}
          </span>
          <span className="text-[10px] text-muted-foreground/50">💬 {post.metric2}</span>
        </div>
      </div>
    </FadeIn>
  );
}

function TikTokCard({ post, delay }: { post: Post; delay: number }) {
  return (
    <FadeIn delay={delay} fullWidth>
      <div className="flex flex-col gap-3 p-5 rounded-2xl bg-white border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 h-full">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.77a4.85 4.85 0 01-1.01-.08z"/>
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">{post.handle}</p>
            <p className="text-[10px] text-muted-foreground/50">#{post.community}</p>
          </div>
        </div>
        <p className="text-sm text-foreground leading-relaxed flex-1">"{post.body}"</p>
        <div className="flex items-center gap-3 pt-1 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground/50">❤️ {post.metric1}</span>
          <span className="text-[10px] text-muted-foreground/50">💬 {post.metric2}</span>
        </div>
      </div>
    </FadeIn>
  );
}

interface SocialProofProps {
  style?: "mixed" | "reddit" | "tiktok";
}

export function SocialProof({ style = "mixed" }: SocialProofProps) {
  const posts = selectPosts(style);

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <h2 className="text-3xl md:text-5xl font-serif text-center mb-4">
            What 2 million people are already asking
          </h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-4">
            These are real posts from Reddit and TikTok — usernames blurred for privacy.
            The questions are real. The confusion is real. The damage is real.
          </p>
          <p className="text-center text-xs text-muted-foreground/50 mb-16">
            Sources: r/SkincareAddiction · r/tretinoin · r/30PlusSkincare · TikTok #SkincareRoutine
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((post, idx) =>
            post.platform === "reddit" ? (
              <RedditCard key={`${post.handle}-${idx}`} post={post} delay={idx * 0.07} />
            ) : (
              <TikTokCard key={`${post.handle}-${idx}`} post={post} delay={idx * 0.07} />
            )
          )}
        </div>

        <FadeIn delay={0.5}>
          <p className="text-center text-sm text-muted-foreground/60 mt-10 italic">
            SkinScreen answers these questions in seconds.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
