// BLX - Fetch and display Blenux's own repos and their latest commits
// Uses the public GitHub API, no token required for public data
// Caches results in localStorage to avoid hitting the rate limit

(function() {
    const USERNAME = 'Blenux';
    const API_BASE = 'https://api.github.com/users/' + USERNAME;
    const API_REPOS = API_BASE + '/repos?type=owner&sort=updated&direction=desc&per_page=6';
    const RATE_LIMIT_MSG = 'GitHub API rate limit reached. Try again later.';
    const CACHE_KEY = 'blenux-github-cache-v3';
    const CACHE_MINUTES = 30;
    const DETAIL_CACHE_PREFIX = 'blenux-github-detail-';
    const DETAIL_CACHE_MINUTES = 60;
    const I3_THEME_ID = 'i3a';

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

    function isI3Theme() {
        const stylesheet = document.getElementById('theme-stylesheet');
        if (!stylesheet) return false;
        return stylesheet.href.indexOf('/css/' + I3_THEME_ID + '.css') !== -1;
    }

    function getCacheKey() {
        return isI3Theme() ? CACHE_KEY + '-' + I3_THEME_ID : CACHE_KEY;
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
            const raw = localStorage.getItem(getCacheKey());
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
            localStorage.setItem(getCacheKey(), JSON.stringify({
                timestamp: Date.now(),
                profile: profile,
                repos: repos,
                commits: commits
            }));
        } catch (e) {
            // Ignore storage errors (e.g. private mode)
        }
    }

    function getDetailCacheKey(repoName) {
        return DETAIL_CACHE_PREFIX + repoName;
    }

    function getDetailCache(repoName) {
        try {
            const raw = localStorage.getItem(getDetailCacheKey(repoName));
            if (!raw) return null;
            const cache = JSON.parse(raw);
            const age = (Date.now() - cache.timestamp) / (1000 * 60);
            if (age > DETAIL_CACHE_MINUTES) return null;
            return cache.branches;
        } catch (e) {
            return null;
        }
    }

    function setDetailCache(repoName, branches) {
        try {
            localStorage.setItem(getDetailCacheKey(repoName), JSON.stringify({
                timestamp: Date.now(),
                branches: branches
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

    async function fetchBranches(repo) {
        try {
            const branches = await fetchJson('https://api.github.com/repos/' + repo.full_name + '/branches?per_page=3');
            return branches.map(branch => branch.name);
        } catch (err) {
            return [repo.default_branch || 'main'];
        }
    }

    async function fetchBranchCommits(repo, branch) {
        try {
            const commits = await fetchJson('https://api.github.com/repos/' + repo.full_name + '/commits?sha=' + encodeURIComponent(branch) + '&per_page=2');
            return commits.map(commit => ({
                message: commit.commit.message,
                url: commit.html_url,
                date: commit.commit.committer ? commit.commit.committer.date : commit.commit.author.date
            }));
        } catch (err) {
            return [];
        }
    }

    async function fetchLatestCommits(repos, count) {
        const topRepos = repos.slice(0, count);
        const requests = topRepos.map(async repo => {
            try {
                const commits = await fetchJson('https://api.github.com/repos/' + repo.full_name + '/commits?per_page=1');
                if (commits.length === 0) return null;
                const commit = commits[0];
                return {
                    repo: repo.name,
                    repoUrl: repo.html_url,
                    message: commit.commit.message,
                    url: commit.html_url,
                    date: commit.commit.committer ? commit.commit.committer.date : commit.commit.author.date
                };
            } catch (err) {
                return null;
            }
        });

        const results = await Promise.all(requests);
        return results.filter(item => item !== null);
    }

    async function fetchCommitsByBranch(repos) {
        if (repos.length === 0) return [];

        const topRepos = repos.slice(0, 2);
        const repoRequests = topRepos.map(async repo => {
            const branches = await fetchBranches(repo);
            const branchRequests = branches.map(async branch => {
                const commits = await fetchBranchCommits(repo, branch);
                return {
                    branch: branch,
                    commits: commits
                };
            });

            const branchData = await Promise.all(branchRequests);
            return {
                repo: repo.name,
                repoUrl: repo.html_url,
                branches: branchData.filter(item => item.commits.length > 0)
            };
        });

        const results = await Promise.all(repoRequests);
        return results.filter(item => item.branches.length > 0);
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

    function renderCommits(container, repoGroups) {
        if (repoGroups.length === 0) {
            setContainerMessage(container, 'No recent commits found in your repos.');
            return;
        }

        container.innerHTML = '';

        repoGroups.forEach(group => {
            const repoHeader = document.createElement('h3');
            repoHeader.className = 'github-repo-header';
            repoHeader.innerHTML = '<a href="' + group.repoUrl + '" target="_blank" rel="noopener">' + group.repo + '</a>';
            container.appendChild(repoHeader);

            const branchGrid = document.createElement('div');
            branchGrid.className = 'github-branch-grid';

            group.branches.forEach(item => {
                const card = document.createElement('div');
                card.className = 'github-branch-card';
                card.innerHTML = '<h4>' + item.branch + '</h4>';

                const list = document.createElement('ul');
                list.className = 'github-list';
                item.commits.forEach(commit => {
                    const message = commit.message.split('\n')[0];
                    list.appendChild(createListItem(`
                        <a href="${commit.url}" target="_blank" rel="noopener">${message}</a>
                        <span class="github-meta">${formatDate(commit.date)}</span>
                    `));
                });

                card.appendChild(list);
                branchGrid.appendChild(card);
            });

            container.appendChild(branchGrid);
        });
    }

    let currentRepos = [];
    let selectedRepoName = '';

    function selectRepo(repoName) {
        const repo = currentRepos.find(r => r.name === repoName);
        if (!repo) return;
        selectedRepoName = repoName;
        const reposEl = document.getElementById('github-repos');
        if (reposEl) renderI3RepoList(reposEl, currentRepos, selectedRepoName);
        const activityEl = document.getElementById('github-activity');
        if (activityEl) renderI3RepoDetail(activityEl, repo);
    }

    function renderI3RepoList(container, repos, activeRepo) {
        if (repos.length === 0) {
            setContainerMessage(container, 'No public repositories found.');
            return;
        }

        container.innerHTML = '';
        const list = document.createElement('ul');
        list.className = 'github-list';
        repos.forEach(repo => {
            const li = document.createElement('li');
            if (repo.name === activeRepo) li.classList.add('selected');
            li.innerHTML = `
                <a href="${repo.html_url}" target="_blank" rel="noopener">${repo.name}</a>
                <span class="github-meta">Updated ${formatDate(repo.updated_at)}</span>
                ${repo.description ? '<p>' + repo.description + '</p>' : ''}
            `;
            li.addEventListener('click', function(e) {
                if (e.target.tagName === 'A') return;
                selectRepo(repo.name);
            });
            list.appendChild(li);
        });
        container.appendChild(list);
    }

    function renderBranchData(container, branchData) {
        if (branchData.length === 0) {
            setContainerMessage(container, 'No recent commits found in this repository.');
            return;
        }

        container.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'github-branch-grid';

        branchData.forEach(item => {
            const card = document.createElement('div');
            card.className = 'github-branch-card';
            card.innerHTML = '<h4>' + item.branch + '</h4>';

            const list = document.createElement('ul');
            list.className = 'github-list';
            item.commits.forEach(commit => {
                const message = commit.message.split('\n')[0];
                list.appendChild(createListItem(`
                    <a href="${commit.url}" target="_blank" rel="noopener">${message}</a>
                    <span class="github-meta">${formatDate(commit.date)}</span>
                `));
            });

            card.appendChild(list);
            grid.appendChild(card);
        });

        container.appendChild(grid);
    }

    async function renderI3RepoDetail(container, repo) {
        const cached = getDetailCache(repo.name);
        if (cached) {
            renderBranchData(container, cached);
            return;
        }

        container.innerHTML = '<p>Loading branches...</p>';
        try {
            const branches = await fetchBranches(repo);
            const branchRequests = branches.map(async branch => {
                const commits = await fetchBranchCommits(repo, branch);
                return { branch, commits };
            });
            const branchData = await Promise.all(branchRequests);
            const filtered = branchData.filter(item => item.commits.length > 0);
            setDetailCache(repo.name, filtered);
            renderBranchData(container, filtered);
        } catch (err) {
            setContainerMessage(container, err.message);
        }
    }

    async function init() {
        const profileEl = document.getElementById('github-profile');
        const reposEl = document.getElementById('github-repos');
        const reposSection = reposEl ? reposEl.closest('.github-section') : null;
        const activityEl = document.getElementById('github-activity');
        const activitySection = activityEl ? activityEl.closest('.github-section') : null;
        if (!profileEl || !reposEl || !activityEl) return;

        const i3Mode = isI3Theme();
        if (i3Mode && activitySection) {
            const heading = activitySection.querySelector('h2');
            if (heading) heading.textContent = 'Branches & Commits';
        }

        const cache = getCache();
        if (cache) {
            renderProfile(profileEl, cache.profile);
            if (i3Mode) {
                currentRepos = cache.repos || [];
                selectedRepoName = currentRepos[0] ? currentRepos[0].name : '';
                renderI3RepoList(reposEl, currentRepos, selectedRepoName);
                if (currentRepos[0]) renderI3RepoDetail(activityEl, currentRepos[0]);
            } else {
                renderRepos(reposEl, cache.repos);
                renderCommits(activityEl, cache.commits);
            }
            return;
        }

        try {
            const [user, repos] = await Promise.all([fetchProfile(), fetchRepos()]);

            if (i3Mode) {
                currentRepos = repos;
                selectedRepoName = repos[0] ? repos[0].name : '';
                setCache(user, repos, []);
                renderProfile(profileEl, user);
                renderI3RepoList(reposEl, repos, selectedRepoName);
                if (repos[0]) await renderI3RepoDetail(activityEl, repos[0]);
            } else {
                const repoGroups = await fetchCommitsByBranch(repos);
                setCache(user, repos, repoGroups);
                renderProfile(profileEl, user);
                renderRepos(reposEl, repos);
                renderCommits(activityEl, repoGroups);
            }
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
