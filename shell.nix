{ pkgs ? import <nixpkgs> {} }:

let
  nixShortcuts = (builtins.fetchurl {
    url = "https://raw.githubusercontent.com/whacked/setup/599e7f6343a80a58ebb1204e305b19e86ce8483e/bash/nix_shortcuts.sh";
    sha256 = "0krdhp4p9iq75b5l5s6i5fiqpxa5zzsf1flzsyl6cl4s0g9y9wwn";
  });
in pkgs.mkShell {
  buildInputs = [
    pkgs.jsonnet
    pkgs.yarn
  ];

  nativeBuildInputs = [
    nixShortcuts
  ];

  shellHook = ''
    export PATH=$(yarn bin):$PATH
    alias pack='npm pack'
    alias build='npm run build'
    alias test='jest --watch'

    echo-shortcuts ${__curPos.file}
  '';
}
