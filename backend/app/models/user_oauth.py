from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class UserOAuthAccount(Base):
    __tablename__ = "user_oauth_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(30), nullable=False)  # "GOOGLE", "MICROSOFT"
    provider_user_id = Column(String(255), nullable=False, index=True)  # sub (Google) ou oid/sub (Microsoft)
    email = Column(String(150), nullable=False, index=True)
    name = Column(String(150), nullable=True)
    picture_url = Column(String(500), nullable=True)
    email_verified = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("provider", "provider_user_id", name="uq_oauth_provider_uid"),
        UniqueConstraint("user_id", "provider", name="uq_user_provider"),
    )

    user = relationship("User", backref="oauth_accounts")
