# Style Flip for Visual Studio Code
Style Flip is an extension for [Visual Studio Code](https://code.visualstudio.com/) that allows you to easily navigate between related code and CSS files.

This extension installs a new VS Code command that is bound by default to `alt+o`. When a code file (tsx/jsx/ts/js) is being edited, pressing `alt+o` will automatically jump to the style file listed in the code file's import statements. Pressing `alt+o` from the style file that was navigated to will jump back to the original code file.

## Configuration
Flipping between files is bound to `alt+o` by default. You can change this through VS Code's [key bindings](https://code.visualstudio.com/docs/getstarted/keybindings):

```json
[
    {
        "key": "<your desired key here>",
        "command": "styleflip.flip",
        "when": "editorTextFocus"
    },
    {
        "key": "alt+o",
        "command": "-styleflip.flip",
        "when": "editorTextFocus"
    }
]
```
