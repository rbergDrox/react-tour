# Changesets

Every pull request that changes the published package adds a changeset:

```sh
npm run changeset
```

To cut a release, run `npx changeset version` (bumps `package.json` and
updates `CHANGELOG.md`), commit, then push a `v*` tag. The release workflow
publishes that tag to npm.
