#!/usr/bin/env python3
"""
BLX - Fetch GitHub activity data server-side and write a static JS file.
Usage: python3 scripts/generate-github-data.py

Requires GITHUB_TOKEN environment variable for authenticated API access (5000 req/hour).
Falls back to unauthenticated requests (60 req/hour) if no token is set.
"""

import json
import os
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

USERNAME = 'Blenux'
API_BASE = 'https://api.github.com/users/' + USERNAME
REPOS_PER_PAGE = 6
REPOS_FOR_BRANCH_DETAIL = 4
BRANCHES_PER_REPO = 3
COMMITS_PER_BRANCH = 5
CONTRIB_COMMITS_PER_REPO = 10

CONTRIB_REPOS = [
    {
        'name': 'Bforartists',
        'full_name': 'Bforartists/Bforartists',
        'html_url': 'https://github.com/Bforartists/Bforartists',
        'contrib': True,
    }
]


def get_token():
    return os.environ.get('GITHUB_TOKEN', '')


def api_get(url):
    """Make an authenticated GitHub API request and return parsed JSON."""
    token = get_token()
    req = urllib.request.Request(url)
    req.add_header('Accept', 'application/vnd.github+json')
    req.add_header('User-Agent', USERNAME)
    if token:
        req.add_header('Authorization', 'Bearer ' + token)

    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"  API error {e.code} for {url}")
        if e.code == 403:
            print("  Rate limit reached.")
        return None
    except Exception as e:
        print(f"  Request failed for {url}: {e}")
        return None


def fetch_profile():
    return api_get(API_BASE)


def fetch_repos():
    url = API_BASE + '/repos?type=owner&sort=updated&direction=desc&per_page=' + str(REPOS_PER_PAGE)
    return api_get(url) or []


def fetch_branches(repo):
    url = 'https://api.github.com/repos/' + repo['full_name'] + '/branches?per_page=' + str(BRANCHES_PER_REPO)
    branches = api_get(url)
    if not branches:
        return [repo.get('default_branch', 'main')]
    return [b['name'] for b in branches]


def fetch_branch_commits(repo, branch):
    url = ('https://api.github.com/repos/' + repo['full_name'] +
           '/commits?sha=' + urllib.parse.quote(branch) +
           '&per_page=' + str(COMMITS_PER_BRANCH))
    commits = api_get(url)
    if not commits:
        return []
    return [
        {
            'message': c['commit']['message'],
            'url': c['html_url'],
            'date': (c['commit'].get('committer') or c['commit'].get('author', {})).get('date', ''),
        }
        for c in commits
    ]


def fetch_contrib_commits(repo):
    url = ('https://api.github.com/repos/' + repo['full_name'] +
           '/commits?author=' + USERNAME +
           '&per_page=' + str(CONTRIB_COMMITS_PER_REPO))
    commits = api_get(url)
    if not commits:
        return []
    return [
        {
            'message': c['commit']['message'],
            'url': c['html_url'],
            'date': (c['commit'].get('committer') or c['commit'].get('author', {})).get('date', ''),
        }
        for c in commits
    ]


def build_owned_repo_data(repos):
    """Fetch branch/commit detail for the top repos."""
    result = []
    for repo in repos[:REPOS_FOR_BRANCH_DETAIL]:
        print(f"  Fetching branches for {repo['name']}...")
        branches = fetch_branches(repo)
        branch_data = []
        for branch in branches:
            print(f"    Fetching commits for branch {branch}...")
            commits = fetch_branch_commits(repo, branch)
            if commits:
                branch_data.append({'branch': branch, 'commits': commits})

        result.append({
            'name': repo['name'],
            'repoUrl': repo['html_url'],
            'branches': branch_data,
        })
    return result


def build_contrib_repo_data():
    """Fetch contribution commits for each contrib repo."""
    result = []
    for repo in CONTRIB_REPOS:
        print(f"  Fetching contrib commits for {repo['name']}...")
        commits = fetch_contrib_commits(repo)
        result.append({
            'name': repo['name'],
            'repoUrl': repo['html_url'],
            'branches': [{'branch': 'main', 'commits': commits}] if commits else [],
        })
    return result


def build_profile_data(user):
    if not user:
        return None
    return {
        'login': user.get('login', USERNAME),
        'name': user.get('name', USERNAME),
        'avatar_url': user.get('avatar_url', ''),
        'bio': user.get('bio', ''),
        'public_repos': user.get('public_repos', 0),
        'followers': user.get('followers', 0),
        'html_url': user.get('html_url', 'https://github.com/' + USERNAME),
    }


def build_repo_list_data(repos):
    """Build the repo list for rendering (owned repos)."""
    return [
        {
            'name': r['name'],
            'full_name': r['full_name'],
            'html_url': r['html_url'],
            'description': r.get('description', ''),
            'updated_at': r.get('updated_at', ''),
            'default_branch': r.get('default_branch', 'main'),
        }
        for r in repos
    ]


def main():
    print("Fetching GitHub profile...")
    user = fetch_profile()
    profile = build_profile_data(user)

    print("Fetching owned repos...")
    repos = fetch_repos()
    repo_list = build_repo_list_data(repos)

    print("Fetching owned repo branch/commit details...")
    owned_detail = build_owned_repo_data(repos)

    print("Fetching contribution repo commits...")
    contrib_detail = build_contrib_repo_data()

    # BLX - Build contrib repo list for rendering
    contrib_repos = [
        {
            'name': r['name'],
            'full_name': r['full_name'],
            'html_url': r['html_url'],
            'description': '',
            'contrib': True,
        }
        for r in CONTRIB_REPOS
    ]

    data = {
        'generated_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'profile': profile,
        'owned_repos': repo_list,
        'owned_detail': owned_detail,
        'contrib_repos': contrib_repos,
        'contrib_detail': contrib_detail,
    }

    js_content = (
        '// BLX - Auto-generated GitHub activity data on ' + data['generated_at'] + '\n'
        '// This file is generated by scripts/generate-github-data.py\n'
        '// Do not edit manually - rendering logic is in github-activity.js\n\n'
        'window.GITHUB_DATA = ' + json.dumps(data, indent=2, ensure_ascii=False) + ';\n'
    )

    script_dir = Path(__file__).parent
    js_dir = script_dir.parent / 'js'
    js_dir.mkdir(exist_ok=True)
    output_file = js_dir / 'github-data.js'

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(js_content)

    print(f"Generated {output_file}")
    print(f"  Profile: {'OK' if profile else 'FAILED'}")
    print(f"  Owned repos: {len(repo_list)}")
    print(f"  Owned detail groups: {len(owned_detail)}")
    print(f"  Contrib repos: {len(contrib_repos)}")
    print(f"  Contrib detail groups: {len(contrib_detail)}")


if __name__ == '__main__':
    main()
