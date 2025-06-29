import { Component, Input, OnChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-country-detail',
  templateUrl: './country-detail.component.html',
  styleUrls: ['./country-detail.component.scss'],

  standalone: false
})
export class CountryDetailComponent implements OnChanges {
  @Input() countryCode!: string;
  countryData: any;

  constructor(private http: HttpClient) {}

  ngOnChanges() {
    if (this.countryCode) {
      this.http
        .get(`https://restcountries.com/v3.1/alpha/${this.countryCode}`)
        .subscribe((data: any) => {
          this.countryData = data[0];
        });
    }
  }

  close() {
    this.countryData = null;
  }
}
