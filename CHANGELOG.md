# Changelog

## [0.3.5](https://github.com/jovulic/flowstate/compare/flowstate-v0.3.4...flowstate-v0.3.5) (2026-03-06)


### General Changes

* actually keep check workflow on 22 to match app ([7a683de](https://github.com/jovulic/flowstate/commit/7a683de02a2a301e3fbc2d60a8c28de7ca6bd91d))
* update node ci node version to 24 ([c1ddacc](https://github.com/jovulic/flowstate/commit/c1ddacc3a35de77e318744cb4129e2fc8dd94422))

## [0.3.4](https://github.com/jovulic/flowstate/compare/flowstate-v0.3.3...flowstate-v0.3.4) (2026-03-06)


### General Changes

* remove registry url from publish ([6df9a4b](https://github.com/jovulic/flowstate/commit/6df9a4bee87a7132704f43730d00b7cd269b20d0))

## [0.3.3](https://github.com/jovulic/flowstate/compare/flowstate-v0.3.2...flowstate-v0.3.3) (2026-03-06)


### General Changes

* update node version to 22 ([42ba069](https://github.com/jovulic/flowstate/commit/42ba06951f35e3fe535d54195c7f0f0105315f57))

## [0.3.2](https://github.com/jovulic/flowstate/compare/flowstate-v0.3.1...flowstate-v0.3.2) (2026-03-06)


### General Changes

* remove npm token as npm works now via oidc ([8def4bc](https://github.com/jovulic/flowstate/commit/8def4bcd080308e5bc1d603ccc4390c45d94376e))
* use pat to allow workflow to trigger other workflows ([44dc1f9](https://github.com/jovulic/flowstate/commit/44dc1f90eca0db655ea9a52f0d07ff992c1c9917))

## [0.3.1](https://github.com/jovulic/flowstate/compare/flowstate-v0.3.0...flowstate-v0.3.1) (2026-03-06)


### General Changes

* split up release from publish workflows ([ae0a386](https://github.com/jovulic/flowstate/commit/ae0a3867169fa8930b5d10f468bdad7d55c6fc1c))

## [0.3.0](https://github.com/jovulic/flowstate/compare/flowstate-v0.2.0...flowstate-v0.3.0) (2026-03-06)


### Features

* add compression support to serialization ([31d26b4](https://github.com/jovulic/flowstate/commit/31d26b47e301f0fc74f895a0d19df816ad942de3))

## [0.2.0](https://github.com/jovulic/flowstate/compare/flowstate-v0.1.7...flowstate-v0.2.0) (2025-12-02)


### Features

* update to nixos-25.11 and use jovulic/release-please-action ([e570cb8](https://github.com/jovulic/flowstate/commit/e570cb8d84802884e21927e7c7fd83645c448162))


### General Changes

* reference jovulic release please ([09ef397](https://github.com/jovulic/flowstate/commit/09ef3971af0a8be6c8fa74d493144cd220cc6051))

## [0.1.7](https://github.com/jovulic/flowstate/compare/flowstate-v0.1.6...flowstate-v0.1.7) (2025-11-28)


### Code Refactoring

* replace all errors with types workflow errors ([46bee10](https://github.com/jovulic/flowstate/commit/46bee10d6e314a16f96aeca2077b2f6e1b3875ce))

## [0.1.6](https://github.com/jovulic/flowstate/compare/flowstate-v0.1.5...flowstate-v0.1.6) (2025-11-26)


### Documentation

* update AGENTS.md and README.md given function reference changes ([f38de5b](https://github.com/jovulic/flowstate/commit/f38de5bbaf4d839df2ae6d375d0e18e2e9c4f2e2))

## [0.1.5](https://github.com/jovulic/flowstate/compare/flowstate-v0.1.4...flowstate-v0.1.5) (2025-11-26)


### Features

* use reference-based serialization for functions ([0d34ce4](https://github.com/jovulic/flowstate/commit/0d34ce484d07d863423b0bda6d3d09be0518c397))


### General Changes

* disable no-explicit-any lint rule ([0732bf8](https://github.com/jovulic/flowstate/commit/0732bf83a0603ec5f593807c3c8346370935e5f0))
* replace function type with function parameters ([abf5e6e](https://github.com/jovulic/flowstate/commit/abf5e6e08b2edc569c7123412c345fd4c7bb61a0))
* update npm modules ([7f730ba](https://github.com/jovulic/flowstate/commit/7f730baa5b249afa5498fa4155872e5b8726a0dc))
* update terser ([f8fcf17](https://github.com/jovulic/flowstate/commit/f8fcf17d3969eedcb8eca10705c9ee7d213e6482))

## [0.1.4](https://github.com/jovulic/flowstate/compare/flowstate-v0.1.3...flowstate-v0.1.4) (2025-10-30)


### Features

* **root:** add GEMINI.md ([dfad6cc](https://github.com/jovulic/flowstate/commit/dfad6cc6f00b7f63f403d9b65a4734dc08685895))


### Bug Fixes

* **nix:** update npm deps hash for package ([40801bb](https://github.com/jovulic/flowstate/commit/40801bbbc2a8e29a8c7067c43b0f0a589af4d45c))


### Code Refactoring

* **root:** rename GEMINI.md to AGENTS.md ([fbde621](https://github.com/jovulic/flowstate/commit/fbde621463de2295d6fc1cb4cc52c203587f912d))


### General Changes

* **root:** update AGENTS.md heading ([0e40191](https://github.com/jovulic/flowstate/commit/0e40191125ae19437393e8ff8307b7dae355622e))

## [0.1.3](https://github.com/jovulic/flowstate/compare/flowstate-v0.1.2...flowstate-v0.1.3) (2025-05-27)


### Features

* **nix:** update nixpkgs to 25.05 ([6c58f7c](https://github.com/jovulic/flowstate/commit/6c58f7c573b6faee98a186c939566e7450245d7b))

## [0.1.2](https://github.com/jovulic/flowstate/compare/flowstate-v0.1.1...flowstate-v0.1.2) (2025-04-01)


### Documentation

* fix typo in readme ([fd0797e](https://github.com/jovulic/flowstate/commit/fd0797ee5f734f43f37e30cfbe87d56a04d8f6e3))
* remove extraneous bolding ([072f629](https://github.com/jovulic/flowstate/commit/072f6298bbf3012197322934c94e3c0089508313))


### Code Refactoring

* **nix:** replace flake-utils with inline system function ([6c301dc](https://github.com/jovulic/flowstate/commit/6c301dc12a2cfa795477a91fee4a27d00dc8e3f2))


### General Changes

* remove message from error super call as it is set below ([f09f0a7](https://github.com/jovulic/flowstate/commit/f09f0a77cdc24e5bfacd7c0aaf89f703480074d5))

## [0.1.1](https://github.com/jovulic/flowstate/compare/flowstate-v0.1.0...flowstate-v0.1.1) (2025-02-24)


### Features

* commit ctl command ([8521e7a](https://github.com/jovulic/flowstate/commit/8521e7ad56279d9551aaa22fa04a95cbba4ca533))
* commit flowstate source ([4a3d9e9](https://github.com/jovulic/flowstate/commit/4a3d9e9dbb264c1767cfbca650bc3b3d27a038d7))
* commit github check and release workflows ([30e9792](https://github.com/jovulic/flowstate/commit/30e9792a5e0888bb5029a1ed605b28c46e918c8d))
* commit nix flake ([7b7a25f](https://github.com/jovulic/flowstate/commit/7b7a25f34cf84c5509bc8d40ed417e5aab9dcf23))
* commit npm and related ([6691063](https://github.com/jovulic/flowstate/commit/6691063603e265b700057b96bf0c387d3b1e5d88))


### Bug Fixes

* commit flake lockfile ([d03d6e3](https://github.com/jovulic/flowstate/commit/d03d6e3b8cb808636522c7f10bfa7a57d6155c56))


### Documentation

* add missing readme features newline ([3d8fb77](https://github.com/jovulic/flowstate/commit/3d8fb77ff384e1de32d8c08477f24d00d9eff611))
* update readme ([c23d366](https://github.com/jovulic/flowstate/commit/c23d3663d941d81f7d301688b76a38711e5a6245))
* update repository description ([73884f2](https://github.com/jovulic/flowstate/commit/73884f2678248d9dcf6f747f22b944ead56cf36c))
