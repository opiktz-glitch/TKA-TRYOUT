from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import (
    Question,
    QuestionOption,
    Subject,
    Tryout,
    TryoutQuestion,
    Answer,
    User
)
from schemas import (
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse
)
from dependencies import require_role


router = APIRouter(
    prefix="/api/questions",
    tags=["Questions"]
)


ALLOWED_TYPES = [
    "MULTIPLE_CHOICE"
]

ALLOWED_DIFFICULTIES = [
    "EASY",
    "MEDIUM",
    "HARD"
]

ALLOWED_OPTIONS = [
    "A",
    "B",
    "C",
    "D",
    "E"
]


# =========================================================
# VALIDATE QUESTION
# =========================================================

def validate_question_data(question_data):

    if question_data.question_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Tipe soal tidak valid"
        )

    if question_data.difficulty not in ALLOWED_DIFFICULTIES:
        raise HTTPException(
            status_code=400,
            detail="Tingkat kesulitan tidak valid"
        )

    if not question_data.question_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Pertanyaan wajib diisi"
        )

    if question_data.points <= 0:
        raise HTTPException(
            status_code=400,
            detail="Bobot soal harus lebih besar dari 0"
        )

    if len(question_data.options) != 5:
        raise HTTPException(
            status_code=400,
            detail="Soal pilihan ganda harus memiliki 5 pilihan"
        )

    option_codes = []

    correct_count = 0

    for option in question_data.options:

        code = option.option_code.strip().upper()

        if code not in ALLOWED_OPTIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Pilihan {code} tidak valid"
            )

        if code in option_codes:
            raise HTTPException(
                status_code=400,
                detail=f"Pilihan {code} duplikat"
            )

        if not option.option_text.strip():
            raise HTTPException(
                status_code=400,
                detail=f"Teks pilihan {code} wajib diisi"
            )

        option_codes.append(code)

        if option.is_correct:
            correct_count += 1

    if set(option_codes) != set(ALLOWED_OPTIONS):
        raise HTTPException(
            status_code=400,
            detail="Pilihan harus terdiri dari A, B, C, D, dan E"
        )

    if correct_count != 1:
        raise HTTPException(
            status_code=400,
            detail="Harus ada tepat satu jawaban benar"
        )


# =========================================================
# CEK PEMAKAIAN SOAL DI TRYOUT
#
# Dipakai sebelum menghapus atau menonaktifkan soal, supaya
# soal yang sudah dipasang di sebuah tryout tidak bisa hilang
# begitu saja. Kalau ini dibiarkan, siswa yang mengerjakan
# tryout akan melihat soal lebih sedikit dari total_questions
# aslinya (soal nonaktif/terhapus di-skip di endpoint siswa),
# padahal saat penilaian soal itu tetap dihitung sebagai salah
# — hasilnya nilai siswa jadi tidak akurat.
# =========================================================

def get_tryout_titles_using_question(
    db: Session,
    question_id: int
) -> list[str]:

    rows = (
        db.query(Tryout.title)
        .join(
            TryoutQuestion,
            TryoutQuestion.tryout_id == Tryout.id
        )
        .filter(
            TryoutQuestion.question_id == question_id
        )
        .distinct()
        .all()
    )

    return [row[0] for row in rows]


# =========================================================
# GET QUESTIONS
# =========================================================

@router.get("", response_model=list[QuestionResponse])
def get_questions(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN", "GURU")
    )
):

    questions = (
        db.query(Question)
        .order_by(Question.id.desc())
        .all()
    )

    result = []

    for question in questions:

        options = (
            db.query(QuestionOption)
            .filter(
                QuestionOption.question_id ==
                question.id
            )
            .order_by(
                QuestionOption.option_code
            )
            .all()
        )

        question.options = options

        result.append(question)

    return result


# =========================================================
# GET QUESTION
# =========================================================

@router.get(
    "/{question_id}",
    response_model=QuestionResponse
)
def get_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN", "GURU")
    )
):

    question = (
        db.query(Question)
        .filter(
            Question.id == question_id
        )
        .first()
    )

    if not question:

        raise HTTPException(
            status_code=404,
            detail="Soal tidak ditemukan"
        )

    options = (
        db.query(QuestionOption)
        .filter(
            QuestionOption.question_id ==
            question.id
        )
        .order_by(
            QuestionOption.option_code
        )
        .all()
    )

    question.options = options

    return question


# =========================================================
# CREATE QUESTION
# =========================================================

@router.post(
    "",
    response_model=QuestionResponse
)
def create_question(
    question_data: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN", "GURU")
    )
):

    validate_question_data(question_data)

    subject = (
        db.query(Subject)
        .filter(
            Subject.id == question_data.subject_id
        )
        .first()
    )

    if not subject:

        raise HTTPException(
            status_code=404,
            detail="Mata pelajaran tidak ditemukan"
        )

    if not subject.is_active:

        raise HTTPException(
            status_code=400,
            detail="Mata pelajaran tidak aktif"
        )

    question = Question(
        subject_id=question_data.subject_id,
        question_text=question_data.question_text.strip(),
        question_type=question_data.question_type,
        difficulty=question_data.difficulty,
        explanation=question_data.explanation,
        points=question_data.points,
        is_active=question_data.is_active,
        created_by=current_user.id
    )

    db.add(question)
    db.flush()

    for option_data in question_data.options:

        option = QuestionOption(
            question_id=question.id,
            option_code=
                option_data.option_code.strip().upper(),
            option_text=
                option_data.option_text.strip(),
            is_correct=
                option_data.is_correct
        )

        db.add(option)

    db.commit()
    db.refresh(question)

    question.options = (
        db.query(QuestionOption)
        .filter(
            QuestionOption.question_id ==
            question.id
        )
        .order_by(
            QuestionOption.option_code
        )
        .all()
    )

    return question


# =========================================================
# UPDATE QUESTION
# =========================================================

@router.put(
    "/{question_id}",
    response_model=QuestionResponse
)
def update_question(
    question_id: int,
    question_data: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN", "GURU")
    )
):

    validate_question_data(question_data)

    question = (
        db.query(Question)
        .filter(
            Question.id == question_id
        )
        .first()
    )

    if not question:

        raise HTTPException(
            status_code=404,
            detail="Soal tidak ditemukan"
        )

    subject = (
        db.query(Subject)
        .filter(
            Subject.id == question_data.subject_id
        )
        .first()
    )

    if not subject:

        raise HTTPException(
            status_code=404,
            detail="Mata pelajaran tidak ditemukan"
        )

    if not subject.is_active:

        raise HTTPException(
            status_code=400,
            detail="Mata pelajaran tidak aktif"
        )

    # -----------------------------------------------------
    # Cegah menonaktifkan soal yang masih dipakai di tryout
    # -----------------------------------------------------

    if question.is_active and not question_data.is_active:

        tryout_titles = get_tryout_titles_using_question(
            db, question.id
        )

        if tryout_titles:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Soal ini tidak dapat dinonaktifkan karena masih "
                    "digunakan pada tryout: "
                    + ", ".join(f'"{title}"' for title in tryout_titles)
                    + ". Hapus soal ini dari tryout tersebut terlebih dahulu."
                )
            )

    question.subject_id = (
        question_data.subject_id
    )

    question.question_text = (
        question_data.question_text.strip()
    )

    question.question_type = (
        question_data.question_type
    )

    question.difficulty = (
        question_data.difficulty
    )

    question.explanation = (
        question_data.explanation
    )

    question.points = (
        question_data.points
    )

    question.is_active = (
        question_data.is_active
    )

    # Hapus pilihan lama
    db.query(QuestionOption).filter(
        QuestionOption.question_id ==
        question.id
    ).delete(
        synchronize_session=False
    )

    # Masukkan pilihan baru
    for option_data in question_data.options:

        option = QuestionOption(
            question_id=question.id,
            option_code=
                option_data.option_code.strip().upper(),
            option_text=
                option_data.option_text.strip(),
            is_correct=
                option_data.is_correct
        )

        db.add(option)

    db.commit()
    db.refresh(question)

    question.options = (
        db.query(QuestionOption)
        .filter(
            QuestionOption.question_id ==
            question.id
        )
        .order_by(
            QuestionOption.option_code
        )
        .all()
    )

    return question


# =========================================================
# DELETE QUESTION
# =========================================================

@router.delete("/{question_id}")
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):

    question = (
        db.query(Question)
        .filter(
            Question.id == question_id
        )
        .first()
    )

    if not question:

        raise HTTPException(
            status_code=404,
            detail="Soal tidak ditemukan"
        )

    # -----------------------------------------------------
    # Cegah menghapus soal yang masih dipakai di tryout
    # -----------------------------------------------------

    tryout_titles = get_tryout_titles_using_question(
        db, question.id
    )

    if tryout_titles:

        raise HTTPException(
            status_code=400,
            detail=(
                "Soal ini tidak dapat dihapus karena masih "
                "digunakan pada tryout: "
                + ", ".join(f'"{title}"' for title in tryout_titles)
                + ". Hapus soal ini dari tryout tersebut terlebih dahulu."
            )
        )

    # -----------------------------------------------------
    # Cegah menghapus soal yang sudah pernah dijawab siswa
    #
    # Soal bisa saja sudah dilepas dari semua tryout (lolos
    # pengecekan di atas) tapi t_answer masih menyimpan
    # jawaban siswa yang menunjuk ke soal ini. Kalau soal
    # tetap dihapus, baris t_answer tersebut jadi yatim dan
    # riwayat/nilai siswa yang bersangkutan jadi tidak valid.
    # -----------------------------------------------------

    answer_count = (
        db.query(Answer)
        .filter(Answer.question_id == question.id)
        .count()
    )

    if answer_count > 0:

        raise HTTPException(
            status_code=400,
            detail=(
                "Soal ini tidak dapat dihapus karena sudah pernah "
                f"dijawab siswa ({answer_count} jawaban tercatat). "
                "Nonaktifkan soal ini saja alih-alih menghapusnya."
            )
        )

    db.query(QuestionOption).filter(
        QuestionOption.question_id ==
        question.id
    ).delete(
        synchronize_session=False
    )

    db.delete(question)

    db.commit()

    return {
        "success": True,
        "message": "Soal berhasil dihapus"
    }