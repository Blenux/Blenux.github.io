// BLX - Fetch and display Blenux's own repos and their latest commits
// Uses the public GitHub API, no token required for public data

(function() {
    const USERNAME = 'Blenux';
    const API_BASE = 'https://api.github.com/users/' + USERNAME;
    const API_REPOS = API_BASE + '/repos?type=owner&sort=updated&direction=desc&per_page=6';
    const RATE_LIMIT_MSG = 'GitHub API rate limit reached. Try again later.';

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

    async function loadProfile(container) {
        try {
            const user = await fetchJson(API_BASE);
            container.innerHTML = `
                <img src="${user.avatar_url}" alt="${user.login}'s avatar" class="github-avatar">
                <h2>${user.name || user.login}</h2>
                ${user.bio ? '<p>' + user.bio + '</p>' : ''}
                <p class="github-stats">
                    ${user.public_repos} public repos &bull; ${user.followers} followers
                </p>
                <p><a href="${user.html_url}" target="_blank" rel="noopener">Visit ${user.login} on GitHub &rarr;</a></p>
            `;
        } catch (err) {
            container.innerHTML = '<p>' + err.message + '</p>';
        }
    }

    async function loadRepos(container) {
        const list = document.createElement('ul');
        list.className = 'github-list';

        try {
            const repos = await fetchJson(API_REPOS);

            if (repos.length === 0) {
                list.appendChild(createListItem('No public repositories found.'));
                container.appendChild(list);
                return;
            }

            repos.forEach(repo => {
                const item = createListItem(`
                    <a href="${repo.html_url}" target="_blank" rel="noopener">${repo.name}</a>
                    <span class="github-meta">Updated ${formatDate(repo.updated_at)}</span>
                    ${repo.description ? '<p>' + repo.description + '</p>' : ''}
                `);
                list.appendChild(item);
            });
        } catch (err) {
            list.appendChild(createListItem(err.message));
        }

        container.appendChild(list);
    }

    async function loadCommits(container) {
        const list = document.createElement('ul');
        list.className = 'github-list';

        try {
            // BLX - Only look at repos owned by this user
            const repos = await fetchJson(API_REPOS);

            if (repos.length === 0) {
                list.appendChild(createListItem('No public repositories found.'));
                container.appendChild(list);
                return;
            }

            // BLX - Fetch the latest commits from the most recently updated repos
            const topRepos = repos.slice(0, 4);
            const commitRequests = topRepos.map(async repo => {
                try {
                    const commits = await fetchJson(`https://api.github.com/repos/${repo.full_name}/commits?per_page=3`);
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

            const results = await Promise.all(commitRequests);
            let commits = results.flat();

            // BLX - Sort by date, newest first
            commits.sort((a, b) => new Date(b.date) - new Date(a.date));
            commits = commits.slice(0, 10);

            if (commits.length === 0) {
                list.appendChild(createListItem('No recent commits found in your repos.'));
                container.appendChild(list);
                return;
            }

            commits.forEach(commit => {
                const message = commit.message.split('\n')[0];
                const item = createListItem(`
                    <a href="${commit.url}" target="_blank" rel="noopener">${message}</a>
                    <span class="github-meta">
                        <a href="${commit.repoUrl}" target="_blank" rel="noopener">${commit.repo}</a>
                        &bull; ${formatDate(commit.date)}
                    </span>
                `);
                list.appendChild(item);
            });
        } catch (err) {
            list.appendChild(createListItem(err.message));
        }

        container.appendChild(list);
    }

    function init() {
        const profile = document.getElementById('github-profile');
        const repos = document.getElementById('github-repos');
        const activity = document.getElementById('github-activity');

        if (profile) loadProfile(profile);
        if (repos) loadRepos(repos);
        if (activity) loadCommits(activity);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
