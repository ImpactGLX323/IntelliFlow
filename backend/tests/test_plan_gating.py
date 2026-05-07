import importlib
import os
import unittest
from contextlib import contextmanager

import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


os.environ.setdefault("DATABASE_URL", "sqlite:///./test_plan_gating.db")
os.environ.setdefault("FIREBASE_ADMIN_SDK_PATH", "")

main_module = importlib.import_module("app.main")
auth_module = importlib.import_module("app.auth")
database_module = importlib.import_module("app.database")
models_module = importlib.import_module("app.models")

app = main_module.app
Base = database_module.Base
User = models_module.User
Organization = models_module.Organization


class PlanGatingTestCase(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = self.SessionLocal()

        def override_get_db():
            try:
                yield self.db
            finally:
                pass

        app.dependency_overrides[database_module.get_db] = override_get_db

    async def asyncSetUp(self) -> None:
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver")

    async def asyncTearDown(self) -> None:
        await self.client.aclose()

    def tearDown(self) -> None:
        self.db.close()
        app.dependency_overrides.clear()

    def _make_user(self, email: str, plan: str) -> User:
        org = Organization(name=f"{plan} Org", slug=f"{plan.lower()}-org", subscription_plan=plan)
        user = User(email=email, firebase_uid=email, full_name=plan.title(), organization=org)
        self.db.add_all([org, user])
        self.db.commit()
        self.db.refresh(user)
        return user

    @contextmanager
    def as_user(self, user: User):
        def override_current_user():
            self.db.refresh(user)
            setattr(user, "plan_level", user.organization.subscription_plan)
            setattr(user, "subscription_plan", user.organization.subscription_plan)
            return user

        app.dependency_overrides[auth_module.get_current_user] = override_current_user
        try:
            yield
        finally:
            app.dependency_overrides.pop(auth_module.get_current_user, None)

    async def test_free_user_blocked_from_premium_routes(self):
        user = self._make_user("free@example.com", "FREE")
        with self.as_user(user):
            for path in (
                "/api/sales-orders/",
                "/api/purchase-orders/",
                "/api/returns/",
                "/api/reorder/suggestions",
                "/api/warehouse-locations",
            ):
                response = await self.client.get(path)
                self.assertEqual(response.status_code, 403, path)
                self.assertTrue(response.json()["detail"]["upgrade_required"])

    async def test_premium_user_can_access_premium_routes_but_not_boost_logistics(self):
        user = self._make_user("pro@example.com", "PRO")
        with self.as_user(user):
            for path in (
                "/api/sales-orders/",
                "/api/purchase-orders/",
                "/api/returns/",
                "/api/reorder/suggestions",
                "/api/warehouse-locations",
            ):
                response = await self.client.get(path)
                self.assertNotEqual(response.status_code, 403, path)

            blocked = await self.client.get("/api/shipments")
            self.assertEqual(blocked.status_code, 403)
            self.assertEqual(blocked.json()["detail"]["required_plan"], "BOOST")

    async def test_boost_user_can_access_logistics_and_premium_routes(self):
        user = self._make_user("boost@example.com", "BOOST")
        with self.as_user(user):
            for path in (
                "/api/sales-orders/",
                "/api/purchase-orders/",
                "/api/returns/",
                "/api/reorder/suggestions",
                "/api/warehouse-locations",
                "/api/shipments",
            ):
                response = await self.client.get(path)
                self.assertNotEqual(response.status_code, 403, path)

    async def test_notification_preferences_are_filtered_by_plan(self):
        expectations = {
            "FREE": {"inventory_low_stock", "inventory_activity", "system"},
            "PRO": {
                "inventory_low_stock",
                "inventory_activity",
                "system",
                "sales_activity",
                "purchasing_activity",
                "returns_profit",
                "weekly_operations_summary",
            },
            "BOOST": {
                "inventory_low_stock",
                "inventory_activity",
                "system",
                "sales_activity",
                "purchasing_activity",
                "returns_profit",
                "weekly_operations_summary",
                "logistics_delay",
                "port_pressure",
                "route_risk",
                "compliance_alert",
                "approval_workflow",
            },
        }
        for plan, expected_categories in expectations.items():
            user = self._make_user(f"{plan.lower()}-prefs@example.com", plan)
            with self.as_user(user):
                response = await self.client.get("/api/notifications/preferences")
                self.assertEqual(response.status_code, 200)
                categories = {item["category"] for item in response.json()}
                self.assertEqual(categories, expected_categories)


if __name__ == "__main__":
    unittest.main()
