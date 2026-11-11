use std::sync::Mutex;

use tauri::{Manager, WindowEvent};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};

struct BackendProcess(Mutex<Option<CommandChild>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(BackendProcess(Mutex::new(None)))
        .setup(|app| {
            let sidecar = app
                .shell()
                .sidecar("ShipmentCheckerPro.Api")
                .map(|command| command.env("SHIPMENTCHECKER_API_URLS", "http://127.0.0.1:5085"));

            match sidecar {
                Ok(command) => {
                    let (mut rx, child) = command.spawn()?;
                    let pid = child.pid();

                    let backend = app.state::<BackendProcess>();
                    *backend.0.lock().expect("backend state poisoned") = Some(child);

                    tauri::async_runtime::spawn(async move {
                        while let Some(event) = rx.recv().await {
                            match event {
                                CommandEvent::Stdout(line) => {
                                    println!("backend sidecar stdout: {}", String::from_utf8_lossy(&line));
                                }
                                CommandEvent::Stderr(line) => {
                                    eprintln!("backend sidecar stderr: {}", String::from_utf8_lossy(&line));
                                }
                                CommandEvent::Terminated(payload) => {
                                    eprintln!(
                                        "backend sidecar process {pid} terminated with code {:?}",
                                        payload.code
                                    );
                                }
                                CommandEvent::Error(error) => {
                                    eprintln!("backend sidecar error: {error}");
                                }
                                _ => {}
                            }
                        }
                    });
                }
                Err(error) => {
                    eprintln!("backend sidecar not available in dev scaffold: {error}");
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, WindowEvent::CloseRequested { .. }) {
                let backend = window.state::<BackendProcess>();
                let child = backend.0.lock().expect("backend state poisoned").take();
                if let Some(child) = child {
                    let _ = child.kill();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running ShipmentChecker Pro");
}
