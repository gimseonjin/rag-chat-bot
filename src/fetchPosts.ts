import dotenv from 'dotenv';
import saveJson from 'utils/saveJson';
import retryWithBackoff from 'utils/retry';
dotenv.config();

type GhostPost = {
    slug: string;
    title: string;
    html: string;
    updated_at: string;
};

type GhostApiListResponse = {
    posts: GhostPost[];
    meta: { pagination: { page: number, limit: number, pages: number, total: number, next: string | null, prev: string | null } };
};

type GhostApiPostResponse = {
    posts: GhostPost[];
};

type GhostPostListItemT = {
    slug: string;
    title: string;
    updated_at: string;
};

type GhostPostItemT = {
    slug: string;
    title: string;
    content: string;
    updated_at: string;
};

const API_KEY = process.env.GHOST_CMS_CONTENT_API_KEY;

const BASE_URL = 'https://guide.anotherclass.co.kr/ghost/api/v3';
const POSTS_URL = `${BASE_URL}/content/posts?key=${API_KEY}`;
const POST_URL = (slug: string) => `${BASE_URL}/content/posts/slug/${slug}?key=${API_KEY}`;

async function getPostList(): Promise<GhostPostListItemT[]> {
    const data = await retryWithBackoff(async () => {
        const response = await fetch(POSTS_URL);
        const json = await response.json() as any;

        if (json.errors) {
            throw new Error(`Ghost API Error: ${json.errors[0]?.message || 'Unknown error'}`);
        }

        return json as GhostApiListResponse;
    }, { maxRetries: 5, baseDelay: 2000 });

    const posts: GhostPostListItemT[] = [];

    const totalPages = data.meta?.pagination?.pages || 1;

    for (let page = 1; page <= totalPages; page++) {
        const pageData = await retryWithBackoff(async () => {
            const response = await fetch(`${POSTS_URL}&page=${page}`);
            const json = await response.json() as any;

            if (json.errors) {
                throw new Error(`Ghost API Error: ${json.errors[0]?.message || 'Unknown error'}`);
            }

            return json as GhostApiListResponse;
        }, { maxRetries: 5, baseDelay: 2000 });

        posts.push(...pageData.posts.map((post) => ({
            slug: post.slug,
            title: post.title,
            updated_at: post.updated_at,
        })));
    }

    return posts;
}

async function getPostContent(slug: string): Promise<GhostPostItemT> {
    const data = await retryWithBackoff(async () => {
        const response = await fetch(POST_URL(slug));
        const json = await response.json() as any;

        if (json.errors) {
            throw new Error(`Ghost API Error: ${json.errors[0]?.message || 'Unknown error'}`);
        }

        return json as GhostApiPostResponse;
    }, { maxRetries: 5, baseDelay: 2000 });

    if (!data.posts || data.posts.length === 0) {
        throw new Error(`No post found for slug: ${slug}`);
    }

    const post = data.posts[0];

    return {
        slug: post.slug,
        title: post.title,
        content: post.html,
        updated_at: post.updated_at,
    };
}

async function fetchPosts(): Promise<Boolean> {
    const postList = await getPostList();
    await saveJson('posts/index.json', postList);

    await Promise.all(postList.map(async (post) => {
        const content = await getPostContent(post.slug);
        await saveJson(`posts/${post.slug}.json`, content);
    }));

    return true;
}

await fetchPosts();
