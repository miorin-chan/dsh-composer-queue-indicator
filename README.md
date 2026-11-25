# Queue send indicator

[简体中文](README.zh.md)

When the agent is busy and clicking **Send** would queue a draft, the button shows an arrow above two stacked lines.
The original click behavior, shortcuts, and queue are unchanged.
Sending immediately, steering, and stopping keep their own controls.

Requires the Web client on DeepSeek Harness `0.2.2-rc.5`.
Enable **Queue send indicator** in Session Atlas.
To install it on its own, run `npm ci` in this checkout and choose the directory in **Plugins → Add plugin**.
Use one installation route so the plugin has only one entry.

[Project documentation](docs/README.md)
