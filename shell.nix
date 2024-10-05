{ pkgs ? import <nixpkgs> {} }:

let
  nixShortcuts = (builtins.fetchurl {
    url = "https://raw.githubusercontent.com/whacked/setup/ff0df8b82d8d93c994d426535184151ac2f2a6a2/bash/nix_shortcuts.sh";
    sha256 = "02n805ja9haiiym8h3hsx1g6ajgbfzg9bywi6phr00d77mylr3s5";
  });
in pkgs.mkShell {
  buildInputs = [
    pkgs.jsonnet
    pkgs.yarn
    pkgs.nodejs
    pkgs.gnumake
  ];

  nativeBuildInputs = [
    nixShortcuts
  ];

  shellHook = ''
    export PATH=$(yarn bin):$PATH
    alias build='npm run build'
    alias test='jest --watch'

    prepublish() {  # prepare for publishing to npmjs
        cd $(dirname "${__curPos.file}")
        rm schematized-config-*.tgz
        if [ -e dist ]; then rm -rf dist; fi
        npm run build

        npm publish --dry-run
        echo 'run `npm publish` to publish the library'
    }

    pack() {  # generate tgz bundle for local file install
        if [ ! -e dist ]; then prepublish; fi
        working_dir=$(dirname "${__curPos.file}")
        pushd $working_dir > /dev/null
            npm pack
            ls -l $working_dir/*.tgz
        popd > /dev/null
    }

    echo-shortcuts "${__curPos.file}"
  '';
}
