// BLX - Fetch and display Blenux's own repos and their latest commits
// Uses the public GitHub API, no token required for public data
// Caches results in localStorage to avoid hitting the rate limit

(function() {
    const USERNAME = 'Blenux';
    const API_BASE = 'https://api.github.com/users/' + USERNAME;
    const API_REPOS = API_BASE + '/repos?type=owner&sort=updated&direction=desc&per_page=6';
    const RATE_LIMIT_MSG = 'GitHub API rate limit reached. Try again later.';
    const CACHE_KEY = 'blenux-github-cache-v2';
    const CACHE_MINUTES = 5;

    function formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function createListItem(html) {
        const li = document.createElement('li');
        li.innerHTML = html;
        return li;
    }

    function setContainerMessage(container, message) {
        container.innerHTML = '<p>' + message + '</p>';
    }

    function renderList(container, items) {
        const list = document.createElement('ul');
        list.className = 'github-list';
        items.forEach(item => list.appendChild(item));
        container.innerHTML = '';
        container.appendChild(list);
    }

    async function fetchJson(url) {
        const response = await fetch(url);
        if (response.status === 403) {
            throw new Error(RATE_LIMIT_MSG);
        }
        if (!response.ok) {
            throw new Error('GitHub API error: ' + response.status);
        }
        return response.json();
    }

    function getCache() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const cache = JSON.parse(raw);
            const age = (Date.now() - cache.timestamp) / (1000 * 60);
            if (age > CACHE_MINUTES) return null;
            return cache;
        } catch (e) {
            return null;
        }
    }

    function setCache(profile, repos, commits) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                profile: profile,
                repos: repos,
                commits: commits
            }));
        } catch (e) {
            // Ignore storage errors (e.g. private mode)
        }
    }

    async function fetchProfile() {
        return await fetchJson(API_BASE);
    }

    async function fetchRepos() {
        return await fetchJson(API_REPOS);
    }

    async function fetchCommits(repos) {
        if (repos.length === 0) return [];

        const topRepos = repos.slice(0, 3);
        const requests = topRepos.map(async repo => {
            try {
                const commits = await fetchJson('https://api.github.com/repos/' + repo.full_name + '/commits?per_page=3');
                return commits.map(commit => ({
                    message: commit.commit.message,
                    repo: repo.name,
                    repoUrl: repo.html_url,
                    url: commit.html_url,
                    date: commit.commit.committer ? commit.commit.committer.date : commit.commit.author.date
                }));
            } catch (err) {
                return [];
            }
        });

        const results = await Promise.all(requests);
        let commits = results.flat();
        commits.sort((a, b) => new Date(b.date) - new Date(a.date));
        return commits.slice(0, 10);
    }

    function renderProfile(container, user) {
        container.innerHTML = `
            <img src="${user.avatar_url}" alt="${user.login}'s avatar" class="github-avatar">
            <h2>${user.name || user.login}</h2>
            ${user.bio ? '<p>' + user.bio + '</p>' : ''}
            <p class="github-stats">
                ${user.public_repos} public repos &bull; ${user.followers} followers
            </p>
            <p><a href="${user.html_url}" target="_blank" rel="noopener">Visit ${user.login} on GitHub &rarr;</a></p>
        `;
    }

    function renderRepos(container, repos) {
        if (repos.length === 0) {
            setContainerMessage(container, 'No public repositories found.');
            return;
        }

        const items = repos.map(repo => createListItem(`
            <a href="${repo.html_url}" target="_blank" rel="noopener">${repo.name}</a>
            <span class="github-meta">Updated ${formatDate(repo.updated_at)}</span>
            ${repo.description ? '<p>' + repo.description + '</p>' : ''}
        `));
        renderList(container, items);
    }

    function renderCommits(container, commits) {
        if (commits.length === 0) {
            setContainerMessage(container, 'No recent commits found in your repos.');
            return;
        }

        const items = commits.map(commit => {
            const message = commit.message.split('\n')[0];
            return createListItem(`
                <a href="${commit.url}" target="_blank" rel="noopener">${message}</a>
                <span class="github-meta">
                    <a href="${commit.repoUrl}" target="_blank" rel="noopener">${commit.repo}</a>
                    &bull; ${formatDate(commit.date)}
                </span>
            `);
        });
        renderList(container, items);
    }

    async function init() {
        const profileEl = document.getElementById('github-profile');
        const reposEl = document.getElementById('github-repos');
        const activityEl = document.getElementById('github-activity');
        if (!profileEl || !reposEl || !activityEl) return;

        const cache = getCache();
        if (cache) {
            renderProfile(profileEl, cache.profile);
            renderRepos(reposEl, cache.repos);
            renderCommits(activityEl, cache.commits);
            return;
        }

        try {
            const [user, repos] = await Promise.all([fetchProfile(), fetchRepos()]);
            const commits = await fetchCommits(repos);

            setCache(user, repos, commits);
            renderProfile(profileEl, user);
            renderRepos(reposEl, repos);
            renderCommits(activityEl, commits);
        } catch (err) {
            setContainerMessage(profileEl, err.message);
            setContainerMessage(reposEl, err.message);
            setContainerMessage(activityEl, err.message);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
