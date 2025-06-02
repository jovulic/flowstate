{
  description = "A library for defining, executing, and persisting computation.";

  inputs = {
    nixpkgs.url = "nixpkgs/nixos-25.05";
  };

  outputs =
    { ... }@inputs:
    let
      inherit (inputs) nixpkgs;
      inherit (inputs.nixpkgs) lib;
      systems = [
        "aarch64-linux"
        "aarch64-darwin"
        "x86_64-darwin"
        "x86_64-linux"
      ];
      eachSystem =
        f:
        lib.genAttrs systems (
          system:
          f {
            pkgs = nixpkgs.legacyPackages.${system};
            inherit system;
          }
        );
    in
    {
      devShells = eachSystem (
        { pkgs, ... }:
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.git
              pkgs.bash
              pkgs.just
              pkgs.nodejs
              pkgs.nodePackages.npm
            ];
            shellHook = ''
              just setup lazy
            '';
          };
        }
      );
      packages = eachSystem (
        { pkgs, ... }:
        {
          default =
            let
              commitHashShort =
                if (builtins.hasAttr "shortRev" inputs.self) then
                  inputs.self.shortRev
                else
                  inputs.self.dirtyShortRev;
            in
            pkgs.buildNpmPackage {
              pname = "flowstate";
              version = commitHashShort;
              src = pkgs.lib.sources.cleanSourceWith {
                src = pkgs.lib.sources.cleanSource ./.;
                filter =
                  path: type:
                  let
                    baseName = builtins.baseNameOf path;
                  in
                  baseName == "package-lock.json"
                  || baseName == "package.json"
                  || baseName == "tsconfig.json"
                  || baseName == "tsconfig.build.json"
                  || pkgs.lib.hasPrefix (toString ./src) (toString path) && !(pkgs.lib.hasSuffix ".test.ts" baseName);
              };
              npmDepsHash = "";
              installPhase = ''
                mkdir -p $out/dist
                cp -r dist $out/
              '';
            };
        }
      );
    };
}
