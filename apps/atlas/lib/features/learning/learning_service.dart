import 'package:fsrs/fsrs.dart' as fsrs;
import '../planning/planning.dart';
import '../workspace/entity.dart';

class LearningService {
  static ({Map<String, dynamic> payload, Map<String, dynamic> log}) review(
    WorkspaceEntity entity,
    int rating,
    DateTime now,
  ) {
    final saved = jsonObject(entity.payload['fsrs_dart']);
    fsrs.Card card;
    if (saved.isNotEmpty) {
      card = fsrs.Card.fromMap(saved);
    } else {
      final old = jsonObject(entity.payload['card']);
      final state = int.tryParse(old['state']?.toString() ?? '0') ?? 0;
      card = fsrs.Card(
        cardId: DateTime.now().microsecondsSinceEpoch,
        state: state == 2
            ? fsrs.State.review
            : state == 3
            ? fsrs.State.relearning
            : fsrs.State.learning,
        stability: (old['stability'] as num?)?.toDouble(),
        difficulty: (old['difficulty'] as num?)?.toDouble(),
        due: DateTime.tryParse(entity.text('due_at'))?.toUtc(),
        lastReview: DateTime.tryParse(
          old['last_review']?.toString() ?? '',
        )?.toUtc(),
      );
    }
    final result = fsrs.Scheduler(enableFuzzing: false).reviewCard(
      card,
      fsrs.Rating.values[rating - 1],
      reviewDateTime: now.toUtc(),
    );
    return (
      payload: {
        ...entity.payload,
        'fsrs_dart': result.card.toMap(),
        'due_at': result.card.due.toUtc().toIso8601String(),
      },
      log: {
        'card_id': entity.legacyKey ?? entity.id,
        'rating': rating,
        'reviewed_at': now.toUtc().toIso8601String(),
        'log': result.reviewLog.toMap(),
      },
    );
  }
}
