import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, shareReplay } from 'rxjs';

export interface CountryDto {
  slug: string;
  name: string;
  population: number | null;
}
export interface CountryPayload extends CountryDto {
  locale: string;
  summary?: string | null;
  content?: any;         // your JSONB structure: facts, sections, media
  updatedAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CountryService {
  private cache = new Map<string, Observable<CountryPayload>>();

  constructor(private http: HttpClient) {}

  getCountry(slug: string, locale = 'en'): Observable<CountryPayload> {
    const key = `${slug}|${locale}`;
    if (!this.cache.has(key)) {
      const req$ = this.http
        .get<CountryPayload>(`${environment.apiBaseUrl}/countries/${slug}`, { params: { locale } })
        .pipe(shareReplay(1));
      this.cache.set(key, req$);
    }
    return this.cache.get(key)!;
  }
}
