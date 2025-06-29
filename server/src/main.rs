use anyhow::Result;
use std::net::SocketAddr;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

mod config;
mod error;
mod server;
mod signaling;
mod room;

use config::Config;
use server::MediaSoupServer;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    info!("Starting MediaSoup server for FoundryVTT");

    // Load configuration
    let config = Config::load()?;
    info!("Loaded configuration: listening on {}", config.listen_addr);

    // Create and start the server
    let server = MediaSoupServer::new(config).await?;
    
    info!("MediaSoup server started successfully");
    
    // Run the server
    server.run().await?;

    Ok(())
}