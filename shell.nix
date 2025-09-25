{
  pkgs ? import <nixpkgs> { },
}:
pkgs.mkShell {
  buildInputs = with pkgs; [
    bun
  ];

  shellHook = ''
    echo "entered shell.nix"
  '';
}