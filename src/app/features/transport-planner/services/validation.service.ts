import { Injectable, inject } from '@angular/core';
import { Problem } from '../models/transport.models';
import { TransportStore } from '../store/transport.store';
import { detectProblems } from '../validators/transport.validators';

@Injectable({ providedIn: 'root' })
export class ValidationService {
  private readonly store = inject(TransportStore);

  problems(): Problem[] {
    return detectProblems(this.store.snapshot());
  }
}
