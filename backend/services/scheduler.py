from apscheduler.schedulers.background import BackgroundScheduler
from services.ai_scanner import AIScanner
from config import Config

class OpportunityScheduler:
    """Background scheduler for automated AI scanning"""
    
    def __init__(self, app):
        """Initialize scheduler with Flask app context"""
        self.app = app
        self.scheduler = BackgroundScheduler()
        self.ai_scanner = AIScanner(Config.GEMINI_API_KEY)
    
    def start(self):
        """Start the scheduler"""
        if not self.ai_scanner.enabled:
            print("AI scanner is disabled. Scheduler will not start.")
            return
        
        # Schedule hourly scan
        self.scheduler.add_job(
            func=self._run_scan,
            trigger='interval',
            hours=1,
            id='hourly_scan',
            name='Hourly opportunity aggregation',
            replace_existing=True
        )
        
        self.scheduler.start()
        print("Opportunity scheduler started successfully")
    
    def _run_scan(self):
        """Run AI scan within Flask app context"""
        with self.app.app_context():
            print("Running scheduled AI scan...")
            self.ai_scanner.scan_for_opportunities()
    
    def run_manual_scan(self):
        """Manually trigger a scan"""
        with self.app.app_context():
            print("Running manual AI scan...")
            self.ai_scanner.scan_for_opportunities()
    
    def shutdown(self):
        """Shutdown the scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            print("Scheduler shutdown successfully")
