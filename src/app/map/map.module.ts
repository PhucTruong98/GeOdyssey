import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './map.component';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { SafeHtmlPipe } from '../shared/pipes/SafeHtml.pipe';
import { CountryMapComponent } from './country-map/country-map.component';

@NgModule({
  declarations: [
    MapComponent,
    CountryMapComponent
  ],
  imports: [
    CommonModule,
    TranslateModule,
    SafeHtmlPipe,
    //ensure that map module is CSR, only initialized on /map route
    RouterModule.forChild([{ path: '', component: MapComponent }])

  ],
  exports: [MapComponent]
})
export class MapModule {}
