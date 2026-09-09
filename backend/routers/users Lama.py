from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import (
    UserCreate,
    UserUpdate,
    UserResponse,
    PasswordReset
)
from auth import hash_password
from dependencies import require_role


router = APIRouter(
    prefix="/api/users",
    tags=["Users"]
)


# =========================================================
# CREATE USER
# =========================================================

@router.post("", response_model=UserResponse)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    allowed_roles = ["ADMIN", "GURU", "SISWA"]

    if user_data.role not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail="Role tidak valid"
        )

    existing_user = db.query(User).filter(
        User.username == user_data.username
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username sudah digunakan"
        )

    new_user = User(
        username=user_data.username,
        password_hash=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        is_active=user_data.is_active
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# =========================================================
# GET ALL USERS
# =========================================================

@router.get("", response_model=list[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    return db.query(User).all()


# =========================================================
# GET USER BY ID
# =========================================================

@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User tidak ditemukan"
        )

    return user


# =========================================================
# RESET PASSWORD USER OLEH ADMIN
# =========================================================

@router.put("/{user_id}/password")
def reset_user_password(
    user_id: int,
    password_data: PasswordReset,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    # -----------------------------------------------------
    # Cari user
    # -----------------------------------------------------

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User tidak ditemukan"
        )

    # -----------------------------------------------------
    # Validasi password
    # -----------------------------------------------------

    if len(password_data.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password minimal 8 karakter"
        )

    # -----------------------------------------------------
    # Hash password baru
    # -----------------------------------------------------

    user.password_hash = hash_password(
        password_data.new_password
    )

    db.commit()

    return {
        "success": True,
        "message": "Password berhasil diubah"
    }


# =========================================================
# UPDATE USER
# =========================================================

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    allowed_roles = ["ADMIN", "GURU", "SISWA"]

    if user_data.role not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail="Role tidak valid"
        )

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User tidak ditemukan"
        )

    # -----------------------------------------------------
    # Cegah ADMIN menonaktifkan dirinya sendiri
    # -----------------------------------------------------

    if user.id == current_user.id and not user_data.is_active:
        raise HTTPException(
            status_code=400,
            detail="ADMIN tidak dapat menonaktifkan akun sendiri"
        )

    # -----------------------------------------------------
    # Cegah ADMIN mengubah dirinya menjadi non-ADMIN
    # jika dirinya adalah ADMIN terakhir
    # -----------------------------------------------------

    if user.id == current_user.id and user_data.role != "ADMIN":

        admin_count = db.query(User).filter(
            User.role == "ADMIN",
            User.is_active == True
        ).count()

        if admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Tidak dapat mengubah role ADMIN terakhir"
            )

    # -----------------------------------------------------
    # Cek username
    # -----------------------------------------------------

    if user.username != user_data.username:

        existing_user = db.query(User).filter(
            User.username == user_data.username
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Username sudah digunakan"
            )

    # -----------------------------------------------------
    # Jika user adalah ADMIN terakhir,
    # jangan izinkan akun menjadi inactive
    # -----------------------------------------------------

    if user.role == "ADMIN" and user.is_active:

        if not user_data.is_active:

            admin_count = db.query(User).filter(
                User.role == "ADMIN",
                User.is_active == True
            ).count()

            if admin_count <= 1:
                raise HTTPException(
                    status_code=400,
                    detail="Tidak dapat menonaktifkan ADMIN terakhir"
                )

    # -----------------------------------------------------
    # Update
    # -----------------------------------------------------

    user.username = user_data.username
    user.full_name = user_data.full_name
    user.role = user_data.role
    user.is_active = user_data.is_active

    db.commit()
    db.refresh(user)

    return user


# =========================================================
# DELETE USER
# =========================================================

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User tidak ditemukan"
        )

    # -----------------------------------------------------
    # Cegah ADMIN menghapus dirinya sendiri
    # -----------------------------------------------------

    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="ADMIN tidak dapat menghapus akun sendiri"
        )

    # -----------------------------------------------------
    # Cegah menghapus ADMIN terakhir
    # -----------------------------------------------------

    if user.role == "ADMIN":

        admin_count = db.query(User).filter(
            User.role == "ADMIN",
            User.is_active == True
        ).count()

        if admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Tidak dapat menghapus ADMIN terakhir"
            )

    # -----------------------------------------------------
    # Delete
    # -----------------------------------------------------

    db.delete(user)
    db.commit()

    return {
        "success": True,
        "message": "User berhasil dihapus"
    }


